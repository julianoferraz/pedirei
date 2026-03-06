/**
 * Fire conversion/purchase events on all configured pixels.
 * Called after a successful order submission from the checkout page.
 */
export function trackPurchase(orderNumber: number, totalAmount: number, currency = 'BRL') {
  // Google Analytics / Google Ads
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'purchase', {
      transaction_id: String(orderNumber),
      value: totalAmount,
      currency,
    });
  }

  // Facebook Pixel
  if (typeof window !== 'undefined' && (window as any).fbq) {
    (window as any).fbq('track', 'Purchase', {
      value: totalAmount,
      currency,
      content_name: `Pedido #${orderNumber}`,
    });
  }

  // TikTok Pixel
  if (typeof window !== 'undefined' && (window as any).ttq) {
    (window as any).ttq.track('PlaceAnOrder', {
      value: totalAmount,
      currency,
      content_id: String(orderNumber),
    });
  }
}
