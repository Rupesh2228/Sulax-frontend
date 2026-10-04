import '../styles/skeletons.css';

export function Skeleton({ className = '', ...props }) {
  return <span className={`skeleton ${className}`.trim()} aria-hidden="true" {...props} />;
}

export function ProductCardSkeleton() {
  return (
    <article className="product-card product-card-skeleton" aria-hidden="true">
      <Skeleton className="product-card-skeleton__image" />
      <div className="product-card-skeleton__info">
        <Skeleton className="product-card-skeleton__category" />
        <Skeleton className="product-card-skeleton__title" />
        <Skeleton className="product-card-skeleton__rating" />
        <Skeleton className="product-card-skeleton__price" />
        <Skeleton className="product-card-skeleton__button" />
      </div>
    </article>
  );
}

export function ProductGridSkeleton({ count = 8, className = '' }) {
  return (
    <div className={`product-grid ${className}`.trim()} role="status" aria-label="Loading products">
      {Array.from({ length: count }, (_, index) => <ProductCardSkeleton key={index} />)}
    </div>
  );
}

export function ProductDetailsSkeleton() {
  return (
    <main className="details-wrap" role="status" aria-label="Loading product details">
      <Skeleton className="skeleton-line skeleton-back-link" />
      <section className="product-main">
        <div className="gallery"><Skeleton className="product-details-skeleton__image" /></div>
        <div className="info product-details-skeleton__info">
          <Skeleton className="skeleton-line product-details-skeleton__title" />
          <Skeleton className="skeleton-line product-details-skeleton__meta" />
          <Skeleton className="skeleton-line product-details-skeleton__rating" />
          <Skeleton className="skeleton-line product-details-skeleton__price" />
          <Skeleton className="skeleton-line product-details-skeleton__stock" />
          <Skeleton className="product-details-skeleton__sizes" />
          <Skeleton className="product-details-skeleton__actions" />
          <Skeleton className="product-details-skeleton__description" />
        </div>
      </section>
      <section className="related">
        <Skeleton className="skeleton-line product-details-skeleton__related-title" />
        <ProductGridSkeleton count={4} />
      </section>
    </main>
  );
}

export function CategorySkeleton({ count = 5 }) {
  return (
    <div className="category-skeleton" role="status" aria-label="Loading categories">
      {Array.from({ length: count }, (_, index) => <Skeleton className="category-skeleton__item" key={index} />)}
    </div>
  );
}

export function TableSkeleton({ columns = 5, rows = 5, className = '' }) {
  return (
    <div className="table-skeleton-wrap" role="status" aria-label="Loading table">
      <table className={className}>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row}>
              {Array.from({ length: columns }, (_, column) => (
                <td key={column}><Skeleton className="table-skeleton__cell" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OrderSkeleton() {
  return (
    <div className="order-skeleton" role="status" aria-label="Loading order">
      <Skeleton className="skeleton-line order-skeleton__title" />
      <Skeleton className="order-skeleton__panel" />
      <TableSkeleton columns={5} rows={3} />
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="dashboard-skeleton" role="status" aria-label="Loading dashboard">
      <div className="dashboard-skeleton__stats">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="dashboard-skeleton__stat" key={index}>
            <Skeleton className="skeleton-line dashboard-skeleton__label" />
            <Skeleton className="skeleton-line dashboard-skeleton__value" />
            <Skeleton className="skeleton-line dashboard-skeleton__hint" />
          </div>
        ))}
      </div>
      <div className="dashboard-skeleton__panels">
        <Skeleton className="dashboard-skeleton__panel" />
        <Skeleton className="dashboard-skeleton__panel" />
      </div>
      <TableSkeleton columns={4} rows={4} className="admin-table" />
    </div>
  );
}

export function AdminFormSkeleton() {
  return (
    <div className="admin-form-skeleton" role="status" aria-label="Loading settings">
      <div className="admin-form-skeleton__column">
        <Skeleton className="admin-form-skeleton__heading" />
        {Array.from({ length: 5 }, (_, index) => <Skeleton className="admin-form-skeleton__field" key={index} />)}
      </div>
      <div className="admin-form-skeleton__column">
        <Skeleton className="admin-form-skeleton__heading" />
        {Array.from({ length: 4 }, (_, index) => <Skeleton className="admin-form-skeleton__field" key={index} />)}
      </div>
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="profile-skeleton" role="status" aria-label="Loading profile">
      <Skeleton className="profile-skeleton__avatar" />
      <Skeleton className="skeleton-line profile-skeleton__name" />
      <Skeleton className="skeleton-line profile-skeleton__detail" />
      <Skeleton className="skeleton-line profile-skeleton__detail" />
      <Skeleton className="skeleton-line profile-skeleton__detail" />
    </div>
  );
}

export function CartItemsSkeleton({ count = 3 }) {
  return (
    <div className="cart-items-skeleton" role="status" aria-label="Loading cart items">
      {Array.from({ length: count }, (_, index) => (
        <div className="cart-items-skeleton__item" key={index}>
          <Skeleton className="cart-items-skeleton__image" />
          <div className="cart-items-skeleton__details">
            <Skeleton className="skeleton-line cart-items-skeleton__name" />
            <Skeleton className="skeleton-line cart-items-skeleton__meta" />
            <Skeleton className="skeleton-line cart-items-skeleton__price" />
          </div>
          <Skeleton className="cart-items-skeleton__qty" />
        </div>
      ))}
    </div>
  );
}

export function ChatSkeleton({ rows = 5 }) {
  return (
    <div className="chat-skeleton" role="status" aria-label="Loading messages">
      {Array.from({ length: rows }, (_, index) => (
        <div className={`chat-skeleton__row${index % 2 ? ' is-sent' : ''}`} key={index}>
          <Skeleton className="chat-skeleton__bubble" />
        </div>
      ))}
    </div>
  );
}

export function NotificationSkeleton() {
  return (
    <div className="notification-skeleton" role="status" aria-label="Loading notifications">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="notification-skeleton__item" key={index}>
          <Skeleton className="notification-skeleton__icon" />
          <div className="notification-skeleton__copy">
            <Skeleton className="skeleton-line notification-skeleton__title" />
            <Skeleton className="skeleton-line notification-skeleton__message" />
            <Skeleton className="skeleton-line notification-skeleton__date" />
          </div>
        </div>
      ))}
    </div>
  );
}
