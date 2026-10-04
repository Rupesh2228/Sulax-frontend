import { Routes, Route, Link } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import ProductDetails from './pages/ProductDetails.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderSuccess from './pages/OrderSuccess.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Account from './pages/Account.jsx';
import EditProfile from './pages/EditProfile.jsx';
import ChangePassword from './pages/ChangePassword.jsx';
import MyOrders from './pages/MyOrders.jsx';
import OrderDetails from './pages/OrderDetails.jsx';
import Wishlist from './pages/Wishlist.jsx';
import Contact from './pages/Contact.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminStats from './pages/admin/AdminStats.jsx';
import AdminProducts from './pages/admin/AdminProducts.jsx';
import AdminOrders from './pages/admin/AdminOrders.jsx';
import AdminCustomers from './pages/admin/AdminCustomers.jsx';
import AdminSEO from './pages/admin/AdminSEO.jsx';
import AdminMessages from './pages/admin/AdminMessages.jsx';
import { useAuth } from './context/AuthContext.jsx';

const P = (el) => <ProtectedRoute>{el}</ProtectedRoute>;

export default function App() {
  const { sessionError, retrySession } = useAuth();
  if (sessionError) {
    return (
      <div className="app-loading" role="alert">
        <p>{sessionError}</p>
        <button className="app-loading__retry" type="button" onClick={retrySession}>Retry</button>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/sulax-itnb-admain" element={P(<AdminDashboard />)}>
        <Route index element={<AdminStats />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="messages" element={<AdminMessages />} />
        <Route path="seo" element={<AdminSEO />} />
      </Route>

      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/contact" element={<Contact />} />

        <Route path="/checkout" element={P(<Checkout />)} />
        <Route path="/order-success/:id" element={P(<OrderSuccess />)} />
        <Route path="/account" element={P(<Account />)} />
        <Route path="/account/edit" element={P(<EditProfile />)} />
        <Route path="/account/password" element={P(<ChangePassword />)} />
        <Route path="/my-orders" element={P(<MyOrders />)} />
        <Route path="/my-orders/:id" element={P(<OrderDetails />)} />
        <Route path="/wishlist" element={P(<Wishlist />)} />

        <Route path="*" element={<div style={{ padding: 60, textAlign: 'center' }}><h2>Page not found</h2><Link to="/">Back to shop</Link></div>} />
      </Route>
    </Routes>
  );
}
