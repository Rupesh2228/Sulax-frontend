import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);
const KEY = 'sulaxCart';
const SIZES = ['6', '7', '8', '9', '10', '11'];

// The cart lives in the browser (like the original), but is treated as UNTRUSTED input:
// we sanitise what we read, and the server re-prices everything when the order is placed.
function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (!Array.isArray(data)) return [];
    return data
      .filter((i) => i && /^[a-f\d]{24}$/i.test(String(i.id)) && SIZES.includes(String(i.size)))
      .map((i) => ({
        id: String(i.id),
        name: String(i.name || '').slice(0, 200),
        price: Number(i.price) || 0,
        image: String(i.image || ''),
        size: String(i.size),
        stock: Math.max(0, Number(i.stock) || 0),
        quantity: Math.min(20, Math.max(1, Math.floor(Number(i.quantity) || 1))),
      }));
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage full/blocked */ }
  }, [items]);

  // returns an error string, or null on success
  const addItem = (product, size, quantity) => {
    if (!size) return 'Please select a shoe size.';
    if (product.stock <= 0) return 'This product is out of stock.';
    const existing = items.find((i) => i.id === product._id && i.size === size);
    const newQty = (existing?.quantity || 0) + quantity;
    if (newQty > product.stock) return `Only ${product.stock} items are available.`;
    if (existing) {
      setItems(items.map((i) => (i === existing ? { ...i, quantity: newQty, stock: product.stock } : i)));
    } else {
      setItems([...items, {
        id: product._id, name: product.name, price: product.price, image: product.image || '',
        size, quantity, stock: product.stock,
      }]);
    }
    return null;
  };

  const changeQty = (index, delta) =>
    setItems((prev) => {
      const next = [...prev];
      const q = next[index].quantity + delta;
      if (q < 1) next.splice(index, 1);
      else if (q <= Math.min(20, next[index].stock || 20)) next[index] = { ...next[index], quantity: q };
      return next;
    });

  const remove = (index) => setItems((prev) => prev.filter((_, i) => i !== index));
  const clear = () => setItems([]);
  const count = items.reduce((t, i) => t + i.quantity, 0);
  const subtotal = items.reduce((t, i) => t + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, changeQty, remove, clear, count, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}
