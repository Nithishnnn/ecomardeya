'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product } from '@/lib/types';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => { success: boolean; message?: string };
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => boolean;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  deliveryCharge: number;
  total: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('supabase_ecommerce_cart');
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to parse cart from storage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem('supabase_ecommerce_cart', JSON.stringify(items));
      } catch (e) {
        console.error('Failed to save cart to storage:', e);
      }
    }
  }, [items, isLoaded]);

  const addToCart = (product: Product, quantity = 1): { success: boolean; message?: string } => {
    if (product.status === 'out_of_stock' || product.stock_quantity <= 0) {
      return { success: false, message: 'Sorry, this product is currently out of stock.' };
    }

    let addedSuccessfully = true;
    let feedback = '';

    setItems((prevItems) => {
      const existing = prevItems.find((item) => item.product.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      const targetQty = currentQty + quantity;

      if (targetQty > product.stock_quantity) {
        addedSuccessfully = false;
        feedback = `Only ${product.stock_quantity} units available in stock.`;
        return prevItems;
      }

      if (existing) {
        return prevItems.map((item) =>
          item.product.id === product.id ? { ...item, quantity: targetQty } : item
        );
      }

      return [...prevItems, { product, quantity }];
    });

    if (addedSuccessfully) {
      setIsCartOpen(true);
    }

    return { success: addedSuccessfully, message: feedback };
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number): boolean => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return true;
    }

    let valid = true;
    setItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          if (quantity > item.product.stock_quantity) {
            valid = false;
            return item;
          }
          return { ...item, quantity };
        }
        return item;
      })
    );

    return valid;
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = items.reduce((sum, item) => {
    const unitPrice = item.product.discount_price ?? item.product.price;
    return sum + unitPrice * item.quantity;
  }, 0);

  // Delivery charge rule: Free delivery for orders above ₹999, else ₹50 (or ₹0 if empty)
  const deliveryCharge = items.length === 0 ? 0 : subtotal >= 999 ? 0 : 50;

  const total = subtotal + deliveryCharge;

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        deliveryCharge,
        total,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
