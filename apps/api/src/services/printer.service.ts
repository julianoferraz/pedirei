/**
 * ESC/POS thermal printer service for Pedirei.Online
 *
 * Generates ESC/POS byte commands for:
 * - 58mm (32 chars) and 80mm (48 chars) thermal printers
 * - Network printers (TCP socket)
 * - USB printers (via raw print)
 *
 * Does NOT depend on native modules — generates raw byte buffers
 * that can be sent via TCP socket or USB.
 */

import { prisma } from '@pedirei/database';
import { formatCurrency } from '@pedirei/shared';
import { NotFoundError } from '../utils/errors.js';
import net from 'node:net';

// ─── ESC/POS Constants ──────────────────────────────────────────────────────

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const CMD = {
  INIT: Buffer.from([ESC, 0x40]), // Initialize
  ALIGN_LEFT: Buffer.from([ESC, 0x61, 0x00]),
  ALIGN_CENTER: Buffer.from([ESC, 0x61, 0x01]),
  ALIGN_RIGHT: Buffer.from([ESC, 0x61, 0x02]),
  BOLD_ON: Buffer.from([ESC, 0x45, 0x01]),
  BOLD_OFF: Buffer.from([ESC, 0x45, 0x00]),
  FONT_NORMAL: Buffer.from([ESC, 0x4d, 0x00]),
  FONT_SMALL: Buffer.from([ESC, 0x4d, 0x01]),
  DOUBLE_HEIGHT: Buffer.from([GS, 0x21, 0x01]),
  DOUBLE_WIDTH: Buffer.from([GS, 0x21, 0x10]),
  DOUBLE_SIZE: Buffer.from([GS, 0x21, 0x11]),
  NORMAL_SIZE: Buffer.from([GS, 0x21, 0x00]),
  CUT: Buffer.from([GS, 0x56, 0x00]), // Full cut
  PARTIAL_CUT: Buffer.from([GS, 0x56, 0x01]),
  FEED_AND_CUT: Buffer.from([GS, 0x56, 0x42, 0x03]), // Feed 3 lines + partial cut
  OPEN_DRAWER: Buffer.from([ESC, 0x70, 0x00, 0x19, 0xfa]), // Kick drawer pin 2
  LINE_FEED: Buffer.from([LF]),
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PrinterConfig {
  type: 'network' | 'usb';
  host?: string;
  port?: number;
  width?: 32 | 48; // 58mm = 32 chars, 80mm = 48 chars
  encoding?: 'cp860' | 'cp850' | 'latin1';
  openDrawer?: boolean;
}

export interface OrderPrintData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryType: 'DELIVERY' | 'PICKUP' | 'TABLE';
  address?: string;
  tableNumber?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
  }>;
  subtotal: number;
  deliveryFee?: number;
  discount?: number;
  total: number;
  paymentMethod: string;
  changeFor?: number;
  notes?: string;
  tenantName: string;
  createdAt: Date;
}

// ─── Receipt Builder ─────────────────────────────────────────────────────────

export class ReceiptBuilder {
  private buffers: Buffer[] = [];
  private width: number;

  constructor(width: 32 | 48 = 48) {
    this.width = width;
    this.buffers.push(CMD.INIT);
  }

  private text(str: string): this {
    this.buffers.push(Buffer.from(str, 'latin1'));
    return this;
  }

  newLine(): this {
    this.buffers.push(CMD.LINE_FEED);
    return this;
  }

  alignLeft(): this {
    this.buffers.push(CMD.ALIGN_LEFT);
    return this;
  }

  alignCenter(): this {
    this.buffers.push(CMD.ALIGN_CENTER);
    return this;
  }

  alignRight(): this {
    this.buffers.push(CMD.ALIGN_RIGHT);
    return this;
  }

  bold(on = true): this {
    this.buffers.push(on ? CMD.BOLD_ON : CMD.BOLD_OFF);
    return this;
  }

  doubleSize(): this {
    this.buffers.push(CMD.DOUBLE_SIZE);
    return this;
  }

  doubleHeight(): this {
    this.buffers.push(CMD.DOUBLE_HEIGHT);
    return this;
  }

  normalSize(): this {
    this.buffers.push(CMD.NORMAL_SIZE);
    return this;
  }

  smallFont(): this {
    this.buffers.push(CMD.FONT_SMALL);
    return this;
  }

  normalFont(): this {
    this.buffers.push(CMD.FONT_NORMAL);
    return this;
  }

  line(char = '-'): this {
    this.text(char.repeat(this.width));
    this.newLine();
    return this;
  }

  doubleLine(): this {
    return this.line('=');
  }

  textLine(content: string): this {
    this.text(content.substring(0, this.width));
    this.newLine();
    return this;
  }

  leftRight(left: string, right: string): this {
    const space = this.width - left.length - right.length;
    if (space < 1) {
      this.textLine(left);
      this.alignRight();
      this.textLine(right);
      this.alignLeft();
    } else {
      this.text(left + ' '.repeat(space) + right);
      this.newLine();
    }
    return this;
  }

  centered(content: string): this {
    this.alignCenter();
    this.textLine(content);
    this.alignLeft();
    return this;
  }

  feed(lines = 3): this {
    for (let i = 0; i < lines; i++) {
      this.newLine();
    }
    return this;
  }

  cut(): this {
    this.buffers.push(CMD.FEED_AND_CUT);
    return this;
  }

  openDrawer(): this {
    this.buffers.push(CMD.OPEN_DRAWER);
    return this;
  }

  build(): Buffer {
    return Buffer.concat(this.buffers);
  }
}

// ─── Order Receipt Formatting ────────────────────────────────────────────────

export function buildOrderReceipt(
  order: OrderPrintData,
  config: PrinterConfig,
): Buffer {
  const width = config.width || 48;
  const r = new ReceiptBuilder(width);

  // Header
  r.alignCenter()
    .bold()
    .doubleSize()
    .textLine(order.tenantName.substring(0, Math.floor(width / 2)))
    .normalSize()
    .bold(false)
    .newLine();

  // Order number + date
  r.bold()
    .doubleHeight()
    .textLine(`PEDIDO #${order.orderNumber}`)
    .normalSize()
    .bold(false);

  const date = order.createdAt;
  const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  r.centered(dateStr);

  r.doubleLine();

  // Delivery info
  r.alignLeft().bold();
  if (order.deliveryType === 'DELIVERY') {
    r.textLine('DELIVERY');
    r.bold(false);
    r.textLine(`Cliente: ${order.customerName}`);
    r.textLine(`Tel: ${order.customerPhone}`);
    if (order.address) {
      // Wrap address to width
      const words = order.address.split(' ');
      let line = '';
      for (const word of words) {
        if ((line + ' ' + word).length > width) {
          r.textLine(line.trim());
          line = word;
        } else {
          line += ' ' + word;
        }
      }
      if (line.trim()) r.textLine(line.trim());
    }
  } else if (order.deliveryType === 'PICKUP') {
    r.textLine('RETIRADA NO LOCAL');
    r.bold(false);
    r.textLine(`Cliente: ${order.customerName}`);
    r.textLine(`Tel: ${order.customerPhone}`);
  } else if (order.deliveryType === 'TABLE') {
    r.textLine(`MESA ${order.tableNumber || '?'}`);
    r.bold(false);
    r.textLine(`Cliente: ${order.customerName}`);
  }

  r.line();

  // Items
  r.bold();
  r.leftRight('ITEM', 'TOTAL');
  r.bold(false);
  r.line();

  for (const item of order.items) {
    const qty = `${item.quantity}x`;
    const itemName = `${qty} ${item.name}`;
    const price = formatCurrency(item.totalPrice);

    r.leftRight(itemName.substring(0, width - price.length - 1), price);

    if (item.quantity > 1) {
      r.smallFont();
      r.textLine(`   (${formatCurrency(item.unitPrice)} cada)`);
      r.normalFont();
    }

    if (item.notes) {
      r.smallFont();
      r.textLine(`   Obs: ${item.notes}`);
      r.normalFont();
    }
  }

  r.line();

  // Totals
  r.leftRight('Subtotal:', formatCurrency(order.subtotal));

  if (order.deliveryFee) {
    r.leftRight('Taxa entrega:', formatCurrency(order.deliveryFee));
  }

  if (order.discount) {
    r.leftRight('Desconto:', `-${formatCurrency(order.discount)}`);
  }

  r.bold();
  r.doubleHeight();
  r.leftRight('TOTAL:', formatCurrency(order.total));
  r.normalSize();
  r.bold(false);

  r.line();

  // Payment
  r.leftRight('Pagamento:', order.paymentMethod);
  if (order.changeFor && order.changeFor > order.total) {
    r.leftRight('Troco para:', formatCurrency(order.changeFor));
    r.leftRight('Troco:', formatCurrency(order.changeFor - order.total));
  }

  // Notes
  if (order.notes) {
    r.line();
    r.bold();
    r.textLine('OBSERVACOES:');
    r.bold(false);
    r.textLine(order.notes);
  }

  r.doubleLine();
  r.alignCenter();
  r.textLine('Pedirei.Online');
  r.feed(2);

  // Cut and drawer
  r.cut();
  if (config.openDrawer) {
    r.openDrawer();
  }

  return r.build();
}

// ─── Kitchen Ticket ──────────────────────────────────────────────────────────

export function buildKitchenTicket(
  order: OrderPrintData,
  config: PrinterConfig,
): Buffer {
  const width = config.width || 48;
  const r = new ReceiptBuilder(width);

  r.alignCenter()
    .bold()
    .doubleSize()
    .textLine('** COZINHA **')
    .normalSize()
    .newLine();

  r.doubleHeight()
    .bold()
    .textLine(`PEDIDO #${order.orderNumber}`)
    .normalSize()
    .bold(false);

  const date = order.createdAt;
  const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  r.centered(timeStr);

  r.alignLeft();
  if (order.deliveryType === 'TABLE') {
    r.bold().doubleSize().textLine(`MESA ${order.tableNumber || '?'}`).normalSize().bold(false);
  } else if (order.deliveryType === 'PICKUP') {
    r.bold().textLine('** RETIRADA **').bold(false);
  } else {
    r.bold().textLine('** DELIVERY **').bold(false);
  }

  r.textLine(`Cliente: ${order.customerName}`);
  r.doubleLine();

  // Items - large and bold for kitchen
  for (const item of order.items) {
    r.bold().doubleHeight();
    r.textLine(`${item.quantity}x ${item.name}`);
    r.normalSize().bold(false);

    if (item.notes) {
      r.bold();
      r.textLine(`  >> ${item.notes}`);
      r.bold(false);
    }
    r.newLine();
  }

  if (order.notes) {
    r.doubleLine();
    r.bold().doubleSize();
    r.textLine('OBS:');
    r.normalSize();
    r.textLine(order.notes);
    r.bold(false);
  }

  r.doubleLine();
  r.feed(2);
  r.cut();

  return r.build();
}

// ─── Session Bill (Salão) ────────────────────────────────────────────────────

export interface SessionBillData {
  tenantName: string;
  tableNumber?: string;
  guestName?: string;
  openedAt: Date;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    notes?: string;
  }>;
  total: number;
  splitPart?: number;
  splitTotal?: number;
  splitAmount?: number;
  paymentMethod?: string;
}

export function buildSessionBill(data: SessionBillData, config: PrinterConfig): Buffer {
  const width = config.width || 48;
  const r = new ReceiptBuilder(width);

  // Cabeçalho
  r.alignCenter().bold().doubleSize()
   .textLine(data.tenantName.substring(0, Math.floor(width / 2)))
   .normalSize().bold(false).newLine();

  // Título da comanda
  r.bold().doubleHeight();
  if (data.tableNumber) {
    r.textLine(`CONTA — MESA ${data.tableNumber}`);
  } else {
    r.textLine('CONTA — BALCÃO');
  }
  r.normalSize().bold(false);

  if (data.guestName) {
    r.textLine(`Responsável: ${data.guestName}`);
  }

  const d = data.openedAt;
  const fmt = (n: number) => n.toString().padStart(2, '0');
  r.textLine(
    `Abertura: ${fmt(d.getDate())}/${fmt(d.getMonth() + 1)}/${d.getFullYear()} ${fmt(d.getHours())}:${fmt(d.getMinutes())}`
  );

  r.doubleLine();

  // Itens
  r.bold().leftRight('ITEM', 'TOTAL').bold(false).line();

  for (const item of data.items) {
    const priceStr = formatCurrency(item.subtotal);
    const label = `${item.quantity}x ${item.name}`;
    r.leftRight(label.substring(0, width - priceStr.length - 1), priceStr);
    if (item.notes) {
      r.smallFont().textLine(`   Obs: ${item.notes}`).normalFont();
    }
  }

  r.line();

  // Total ou split
  if (data.splitPart && data.splitTotal && data.splitAmount !== undefined) {
    r.textLine(`Total geral: ${formatCurrency(data.total)}`);
    r.bold().doubleHeight()
     .leftRight(`PARTE ${data.splitPart}/${data.splitTotal}:`, formatCurrency(data.splitAmount))
     .normalSize().bold(false);
  } else {
    r.bold().doubleHeight()
     .leftRight('TOTAL:', formatCurrency(data.total))
     .normalSize().bold(false);
  }

  if (data.paymentMethod) {
    r.line();
    r.leftRight('Pagamento:', data.paymentMethod);
  }

  r.doubleLine().alignCenter()
   .textLine('Obrigado pela preferência!')
   .textLine('Pedirei.Online')
   .feed(3).cut();

  if (config.openDrawer) r.openDrawer();

  return r.build();
}

// ─── Network Printing ────────────────────────────────────────────────────────

export function printToNetwork(
  data: Buffer,
  host: string,
  port = 9100,
  timeout = 5000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        reject(new Error(`Timeout conectando à impressora ${host}:${port}`));
      }
    }, timeout);

    socket.connect(port, host, () => {
      socket.write(data, () => {
        clearTimeout(timer);
        socket.end();
        if (!resolved) {
          resolved = true;
          resolve();
        }
      });
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      if (!resolved) {
        resolved = true;
        reject(new Error(`Erro ao imprimir: ${err.message}`));
      }
    });
  });
}

// ─── Print Order ────────────────────────────────────────────────────────────

export async function printOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          menuItem: { select: { name: true } },
        },
      },
      customer: { select: { name: true, phone: true } },
      tenant: {
        select: {
          name: true,
          printerType: true,
          printerIp: true,
          printerPort: true,
          printerWidth: true,
        },
      },
    },
  });

  if (!order) throw new NotFoundError('Pedido');

  const tenant = order.tenant;

  if (!tenant.printerType || !tenant.printerIp) {
    return { success: false, error: 'Impressora não configurada' };
  }

  const printerConfig: PrinterConfig = {
    type: (tenant.printerType as 'network' | 'usb') || 'network',
    host: tenant.printerIp || undefined,
    port: tenant.printerPort || 9100,
    width: (tenant.printerWidth as 32 | 48) || 48,
    openDrawer: true,
  };

  const printData: OrderPrintData = {
    orderId: order.id,
    orderNumber: String(order.orderNumber),
    customerName: order.customer.name || 'Cliente',
    customerPhone: order.customer.phone,
    deliveryType: order.deliveryAddress ? 'DELIVERY' : 'PICKUP',
    address: order.deliveryAddress || undefined,
    items: order.items.map((item: any) => ({
      name: item.menuItem?.name || item.name,
      quantity: item.quantity,
      unitPrice: Number(item.price),
      totalPrice: Number(item.price) * item.quantity,
      notes: item.notes || undefined,
    })),
    subtotal: Number(order.subtotal),
    deliveryFee: order.deliveryFee ? Number(order.deliveryFee) : undefined,
    discount: undefined,
    total: Number(order.totalAmount),
    paymentMethod: order.paymentMethod,
    changeFor: order.changeFor ? Number(order.changeFor) : undefined,
    notes: order.generalNotes || undefined,
    tenantName: tenant.name,
    createdAt: order.createdAt,
  };

  try {
    // Print customer receipt
    const receipt = buildOrderReceipt(printData, printerConfig);
    await printToNetwork(receipt, printerConfig.host!, printerConfig.port);

    // Print kitchen ticket
    const kitchen = buildKitchenTicket(printData, printerConfig);
    await printToNetwork(kitchen, printerConfig.host!, printerConfig.port);

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ─── Test Print ──────────────────────────────────────────────────────────────

export async function testPrint(config: PrinterConfig): Promise<void> {
  const r = new ReceiptBuilder(config.width || 48);

  r.alignCenter()
    .bold()
    .doubleSize()
    .textLine('TESTE DE IMPRESSAO')
    .normalSize()
    .bold(false)
    .newLine()
    .centered('Pedirei.Online')
    .newLine()
    .centered('Impressora funcionando!')
    .newLine()
    .line()
    .centered(new Date().toLocaleString('pt-BR'))
    .feed(2)
    .cut();

  const data = r.build();

  if (config.type === 'network' && config.host) {
    await printToNetwork(data, config.host, config.port);
  } else {
    throw new Error('Tipo de impressora não suportado ou host não configurado');
  }
}
