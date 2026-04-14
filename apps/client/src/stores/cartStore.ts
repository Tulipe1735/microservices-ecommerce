import { CartStoreActionsType, CartStoreStateType } from "@repo/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const useCartStore = create<CartStoreStateType & CartStoreActionsType>()(
  persist(
    (set) => ({
      cart: [],
      hasHydrated: false,
      addToCart: (product) =>
        set((state) => {
          // 1. 查找是否已经存在相同 ID、尺寸和颜色的产品
          const isExisting = state.cart.find(
            (p) =>
              p.id === product.id &&
              p.selectedSize === product.selectedSize &&
              p.selectedColor === product.selectedColor,
          );

          if (isExisting) {
            // 2. 如果存在，使用 map 返回一个新数组，并更新目标产品的 quantity
            return {
              cart: state.cart.map((item) =>
                item.id === product.id &&
                item.selectedSize === product.selectedSize &&
                item.selectedColor === product.selectedColor
                  ? {
                      ...item,
                      quantity: item.quantity + (product.quantity || 1),
                    }
                  : item,
              ),
            };
          }

          return {
            cart: [
              ...state.cart,
              {
                ...product,
                quantity: product.quantity || 1,
                selectedSize: product.selectedSize,
                selectedColor: product.selectedColor,
              },
            ],
          };
        }),
      removeFromCart: (product) =>
        set((state) => ({
          cart: state.cart.filter(
            (item) =>
              !(
                item.id === product.id &&
                item.selectedSize === product.selectedSize &&
                item.selectedColor === product.selectedColor
              ),
          ),
        })),
      clearCart: () => set({ cart: [] }),
    }),
    {
      name: "cart",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hasHydrated = true;
        }
      },
    },
  ),
);

export default useCartStore;
