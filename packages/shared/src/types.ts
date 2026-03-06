export type OrderMode = 'ALWAYS_SITE' | 'ALWAYS_WHATSAPP' | 'CLIENT_CHOOSES';
export type DeliveryFeeMode = 'FIXED' | 'DISTANCE_BASED';
export type AiMode = 'PLATFORM_KEY' | 'TENANT_KEY' | 'HYBRID';
export type WhatsappStatus = 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'BANNED';
export type AdminRole = 'OWNER' | 'OPERATOR' | 'DRIVER';
export type OrderStatus = 'RECEIVED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'PIX_AUTO' | 'PIX_DELIVERY' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'CASH';
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'REFUNDED';
export type CampaignType = 'PROMOTIONAL' | 'REENGAGEMENT';
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED';
export type MarketplaceSource = 'IFOOD' | 'RAPPI';
export type MarketplaceStatus = 'CONNECTED' | 'DISCONNECTED' | 'PENDING' | 'ERROR';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface JwtPayload {
  sub: string;
  tenantId?: string;
  role: 'OWNER' | 'OPERATOR' | 'DRIVER' | 'MASTER';
  email: string;
  iat?: number;
  exp?: number;
}

export interface TenantPublicInfo {
  slug: string;
  name: string;
  phone: string;
  address?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  orderMode: OrderMode;
  minOrderValue?: number;
  deliveryFeeMode: DeliveryFeeMode;
  fixedDeliveryFee?: number;
  estimatedDelivery: string;
  pixAutoEnabled: boolean;
  pixOnDelivery: boolean;
  cardCreditEnabled: boolean;
  cardDebitEnabled: boolean;
  cashEnabled: boolean;
  creditFeePercent: number;
  debitFeePercent: number;
  hasBranding: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  items: MenuItemPublic[];
}

export interface MenuItemPublic {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isPaused: boolean;
  sortOrder: number;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface CreateOrderPayload {
  items: Array<{
    menuItemId: string;
    quantity: number;
    notes?: string;
  }>;
  deliveryAddress?: string;
  deliveryRef?: string;
  paymentMethod: PaymentMethod;
  needsChange?: boolean;
  changeFor?: number;
  generalNotes?: string;
  customerPhone: string;
  customerName?: string;
}

export interface OrderSummary {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  cardFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    notes?: string;
  }>;
  createdAt: string;
  estimatedDelivery?: string;
}

export interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  avgTicket: number;
  pendingOrders: number;
  preparingOrders: number;
  outForDeliveryOrders: number;
  deliveredToday: number;
  cancelledToday: number;
}

export interface MasterDashboardStats {
  totalTenants: number;
  activeTenants: number;
  todayOrdersGlobal: number;
  todayRevenueGlobal: number;
  connectedWhatsapp: number;
  disconnectedWhatsapp: number;
  totalAiTokensToday: number;
}

// ─── Salão ────────────────────────────────────────────────────

export type StockMode = 'NONE' | 'AVAILABLE' | 'BY_QUANTITY';
export type SessionStatus = 'OPEN' | 'CLOSED';
export type TableStatusView = 'AVAILABLE' | 'OCCUPIED';

export interface TableWithStatus {
  id: string;
  number: string;
  label: string | null;
  capacity: number;
  posX: number;
  posY: number;
  isActive: boolean;
  status: TableStatusView;
  session?: { id: string; guestName: string | null; openedAt: string; totalAmount: number } | null;
}

export interface SessionItemView {
  id: string;
  menuItemId: string | null;
  customName: string | null;
  customPrice: number | null;
  name: string;
  unitPrice: number;
  quantity: number;
  notes: string | null;
  addedAt: string;
}

export interface SessionDetail {
  id: string;
  tableId: string | null;
  guestName: string | null;
  status: SessionStatus;
  openedAt: string;
  closedAt: string | null;
  totalAmount: number;
  paymentMethod: string | null;
  items: SessionItemView[];
  table?: { id: string; number: string; label: string | null } | null;
}
