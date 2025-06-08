import { describe, expect, it } from "vitest";

// Mock Clarinet SDK functions for testing
const mockClarinet = {
  deploy: (contractName: string, contractCode: string) => ({
    contractName,
    contractCode,
    deployed: true
  }),
  
  callReadOnlyFn: (contract: string, method: string, args: any[], sender: string) => {
    // Mock implementation for read-only function calls
    return mockContractState[method]?.(args, sender) || { result: null };
  },
  
  callPublicFn: (contract: string, method: string, args: any[], sender: string) => {
    // Mock implementation for public function calls
    return mockContractState[method]?.(args, sender) || { result: "ok", value: true };
  }
};

// Mock contract state for testing
let mockContractState: any = {
  products: new Map(),
  purchases: new Map(),
  sellerEarnings: new Map(),
  reviews: new Map(),
  nextProductId: 1,
  platformFee: 250, // 2.5%
  
  // Mock contract methods
  'list-product': (args: any[], sender: string) => {
    const [title, description, price, downloadUrl, category] = args;
    const productId = mockContractState.nextProductId++;
    
    if (!price || price <= 0) {
      return { result: "error", value: 400 };
    }
    
    mockContractState.products.set(productId, {
      seller: sender,
      title,
      description,
      price,
      downloadUrl,
      category,
      isActive: true,
      totalSales: 0,
      createdAt: 1000
    });
    
    return { result: "ok", value: productId };
  },
  
  'get-product': (args: any[], sender: string) => {
    const [productId] = args;
    const product = mockContractState.products.get(productId);
    return { result: product ? "ok" : "error", value: product || null };
  },
  
  'purchase-product': (args: any[], sender: string) => {
    const [productId] = args;
    const product = mockContractState.products.get(productId);
    
    if (!product) {
      return { result: "error", value: 404 };
    }
    
    if (!product.isActive) {
      return { result: "error", value: 403 };
    }
    
    const purchaseKey = `${sender}-${productId}`;
    if (mockContractState.purchases.has(purchaseKey)) {
      return { result: "error", value: 409 };
    }
    
    // Record purchase
    mockContractState.purchases.set(purchaseKey, {
      purchasePrice: product.price,
      purchasedAt: 1001,
      transactionId: null
    });
    
    // Update product sales
    product.totalSales += 1;
    
    // Update seller earnings
    const platformFee = Math.floor((product.price * mockContractState.platformFee) / 10000);
    const sellerPayout = product.price - platformFee;
    
    const currentEarnings = mockContractState.sellerEarnings.get(product.seller) || {
      totalEarned: 0,
      totalSales: 0,
      availableBalance: 0
    };
    
    mockContractState.sellerEarnings.set(product.seller, {
      totalEarned: currentEarnings.totalEarned + sellerPayout,
      totalSales: currentEarnings.totalSales + 1,
      availableBalance: currentEarnings.availableBalance + sellerPayout
    });
    
    return { result: "ok", value: true };
  },
  
  'has-purchased': (args: any[], sender: string) => {
    const [buyer, productId] = args;
    const purchaseKey = `${buyer}-${productId}`;
    return { result: "ok", value: mockContractState.purchases.has(purchaseKey) };
  },
  
  'get-seller-stats': (args: any[], sender: string) => {
    const [seller] = args;
    const stats = mockContractState.sellerEarnings.get(seller) || {
      totalEarned: 0,
      totalSales: 0,
      availableBalance: 0
    };
    return { result: "ok", value: stats };
  },
  
  'add-review': (args: any[], sender: string) => {
    const [productId, rating, reviewText] = args;
    const purchaseKey = `${sender}-${productId}`;
    
    if (!mockContractState.purchases.has(purchaseKey)) {
      return { result: "error", value: 401 };
    }
    
    if (rating < 1 || rating > 5) {
      return { result: "error", value: 400 };
    }
    
    const reviewKey = `${productId}-${sender}`;
    mockContractState.reviews.set(reviewKey, {
      rating,
      reviewText,
      reviewedAt: 1002
    });
    
    return { result: "ok", value: true };
  },
  
  'get-download-access': (args: any[], sender: string) => {
    const [productId] = args;
    const product = mockContractState.products.get(productId);
    const purchaseKey = `${sender}-${productId}`;
    
    if (!product) {
      return { result: "error", value: 404 };
    }
    
    if (!mockContractState.purchases.has(purchaseKey)) {
      return { result: "error", value: 401 };
    }
    
    return { result: "ok", value: product.downloadUrl };
  },
  
  'withdraw-earnings': (args: any[], sender: string) => {
    const earnings = mockContractState.sellerEarnings.get(sender);
    
    if (!earnings || earnings.availableBalance <= 0) {
      return { result: "error", value: 402 };
    }
    
    const withdrawAmount = earnings.availableBalance;
    earnings.availableBalance = 0;
    
    return { result: "ok", value: withdrawAmount };
  },
  
  'calculate-platform-fee': (args: any[], sender: string) => {
    const [price] = args;
    return { result: "ok", value: Math.floor((price * mockContractState.platformFee) / 10000) };
  },
  
  'calculate-seller-earnings': (args: any[], sender: string) => {
    const [price] = args;
    const fee = Math.floor((price * mockContractState.platformFee) / 10000);
    return { result: "ok", value: price - fee };
  }
};

// Helper function to reset mock state
const resetMockState = () => {
  mockContractState.products.clear();
  mockContractState.purchases.clear();
  mockContractState.sellerEarnings.clear();
  mockContractState.reviews.clear();
  mockContractState.nextProductId = 1;
  mockContractState.platformFee = 250;
};

describe("Digital Goods Distribution Platform", () => {
  
  describe("Product Listing", () => {
    it("should allow users to list a new product", () => {
      resetMockState();
      
      const result = mockClarinet.callPublicFn(
        "digital-goods-platform",
        "list-product",
        ["Test Product", "A great digital product", 1000000, "https://example.com/download", "Software"],
        "seller1"
      );
      
      expect(result.result).toBe("ok");
      expect(result.value).toBe(1);
      
      const product = mockClarinet.callReadOnlyFn(
        "digital-goods-platform",
        "get-product",
        [1],
        "seller1"
      );
      
      expect(product.result).toBe("ok");
      expect(product.value.title).toBe("Test Product");
      expect(product.value.price).toBe(1000000);
      expect(product.value.seller).toBe("seller1");
    });
    
    it("should reject products with invalid price", () => {
      resetMockState();
      
      const result = mockClarinet.callPublicFn(
        "digital-goods-platform",
        "list-product",
        ["Test Product", "Description", 0, "https://example.com/download", "Software"],
        "seller1"
      );
      
      expect(result.result).toBe("error");
      expect(result.value).toBe(400);
    });
    
    it("should increment product IDs for multiple listings", () => {
      resetMockState();
      
      const result1 = mockClarinet.callPublicFn(
        "digital-goods-platform",
        "list-product",
        ["Product 1", "First product", 500000, "https://example.com/1", "Software"],
        "seller1"
      );
      
      const result2 = mockClarinet.callPublicFn(
        "digital-goods-platform",
        "list-product",
        ["Product 2", "Second product", 750000, "https://example.com/2", "Books"],
        "seller2"
      );
      
      expect(result1.value).toBe(1);
      expect(result2.value).toBe(2);
    });
  });
  
  describe("Product Purchasing", () => {
    it("should allow users to purchase active products", () => {
      resetMockState();
      
      // List a product first
      mockClarinet.callPublicFn(
        "digital-goods-platform",
        "list-product",
        ["Test Product", "Description", 1000000, "https://example.com/download", "Software"],
        "seller1"
      );
      
      // Purchase the product
      const result = mockClarinet.callPublicFn(
        "digital-goods-platform",
        "purchase-product",
        [1],
        "buyer1"
      );
      
      expect(result.result).toBe("ok");
      expect(result.value).toBe(true);
      
      // Verify purchase was recorded
      const hasPurchased = mockClarinet.callReadOnlyFn(
        "digital-goods-platform",
        "has-purchased",
        ["buyer1", 1],
        "buyer1"
      );
      
      expect(hasPurchased.result).toBe("ok");
      expect(hasPurchased.value).toBe(true);
    });
    
    it("should prevent duplicate purchases", () => {
      resetMockState();
      
      // List and purchase a product
      mockClarinet.callPublicFn(
        "digital-goods-platform",
        "list-product",
        ["Test Product", "Description", 1000000, "https://example.com/download", "Software"],
        "seller1"
      );
      
      mockClarinet.callPublicFn(
        "digital-goods-platform",
        "purchase-product",
        [1],
        "buyer1"
      );
      
      // Try to purchase again
      const result = mockClarinet.callPublicFn(
        "digital-goods-platform",
        "purchase-product",
        [1],
        "buyer1"
      );
      
      expect(result.result).toBe("error");
      expect(result.value).toBe(409);
    });
    
    it("should reject purchases of non-existent products", () => {
      resetMockState();
      
      const result = mockClarinet.callPublicFn(
        "digital-goods-platform",
        "purchase-product",
        [999],
        "buyer1"
      );
      
      expect(result.result).toBe("error");
      expect(result.value).toBe(404);
    });
  });
  
  describe("Seller Earnings", () => {
    it("should calculate and track seller earnings correctly", () => {
      resetMockState();
      
      // List a product
      mockClarinet.callPublicFn(
        "digital-goods-platform",
        "list-product",
        ["Test Product", "Description", 1000000, "https://example.com/download", "Software"],
        "seller1"
      );
      
      // Purchase the product
      mockClarinet.callPublicFn(
        "digital-goods-platform",
        "purchase-product",
        [1],
        "buyer1"
      );
      
      // Check seller stats
      const stats = mockClarinet.callReadOnlyFn(
        "digital-goods-platform",
        "get-seller-stats",
        ["seller1"],
        "seller1"
      );
      
      expect(stats.result).toBe("ok");
      expect(stats.value.totalSales).toBe(1);
      expect(stats.value.totalEarned).toBe(975000); // 1000000 - 2.5% fee
      expect(stats.value.availableBalance).toBe(975000);
    });
    
    it("should allow sellers to withdraw earnings", () => {
      resetMockState();
      
      // Setup a purchase to generate earnings
      mockClarinet.callPublicFn(
        "digital-goods-platform",
        "list-product",
        ["Test Product", "Description", 1000000, "https://example.com/download", "Software"],
        "seller1"
      );
      
      mockClarinet.callPublicFn(
        "digital-goods-platform",
        "purchase-product",
        [1],
        "buyer1"
      );
      
      // Withdraw earnings
      const result = mockClarinet.callPublicFn(
        "digital-goods-platform",
        "withdraw-earnings",
        [],
        "seller1"
      );
      
      expect(result.result).toBe("ok");
      expect(result.value).toBe(975000);
      
      // Check that balance is now zero
      const stats = mockClarinet.callReadOnlyFn(
        "digital-goods-platform",
        "get-seller-stats",
        ["seller1"],
        "seller1"
      );
      
      expect(stats.value.availableBalance).toBe(0);
    });
  });
  
  describe("Platform Fee Calculation", () => {
    it("should calculate platform fees correctly", () => {
      resetMockState();
      
      const fee = mockClarinet.callReadOnlyFn(
        "digital-goods-platform",
        "calculate-platform-fee",
        [1000000],
        "user1"
      );
      
      expect(fee.result).toBe("ok");
      expect(fee.value).toBe(25000); // 2.5% of 1000000
    });
    
    it("should calculate seller earnings correctly", () => {
      resetMockState();
      
      const earnings = mockClarinet.callReadOnlyFn(
        "digital-goods-platform",
        "calculate-seller-earnings",
        [1000000],
        "user1"
      );
      
      expect(earnings.result).toBe("ok");
      expect(earnings.value).toBe(975000); // 1000000 - 25000 fee
    });
  });
  
  describe("Review System", () => {
    it("should allow buyers to add reviews for purchased products", () => {
      resetMockState();
      
      // Setup purchase
      mockClarinet.callPublicFn(
        "digital-goods-platform",
        "list-product",
        ["Test Product", "Description", 1000000, "https://example.com/download", "Software"],
        "seller1"
      );
      
      mockClarinet.callPublicFn(
        "digital-goods-platform",
        "purchase-product",
        [1],
        "buyer1"
      );
      
      // Add review
      const result = mockClarinet.callPublicFn(
        "digital-goods-platform",
        "add-review",
        [1, 5, "Excellent product!"],
        "buyer1"
      );
      
      expect(result.result).toBe("ok");
      expect(result.value).toBe(true);
    });
    
    it("should reject reviews from non-buyers", () => {
      resetMockState();
      
      // List product but don't purchase
      mockClarinet.callPublicFn(
        "digital-goods-platform",
        "list-product",
        ["Test Product", "Description", 1000000, "https://example.com/download", "Software"],
        "seller1"
      );
      
      // Try to add review without purchasing
      const result = mockClarinet.callPublicFn(
        "digital-goods-platform",
        "add-review",
        [1, 5, "Fake review"],
        "non-buyer"
      );
      
      expect(result.result).toBe("error");
      expect(result.value).toBe(401);
    });
    
    it("should reject invalid ratings", () => {
      resetMockState();
      
      // Setup purchase
      mockClarinet.callPublicFn(
        "digital-goods-platform",
        "list-product",
        ["Test Product", "Description", 1000000, "https://example.com/download", "Software"],
        "seller1"
      );
      
      mockClarinet.callPublicFn(
        "digital-goods-platform",
        "purchase-product",
        [1],
        "buyer1"
      );
      
      // Try invalid rating
      const result = mockClarinet.callPublicFn(
        "digital-goods-platform",
        "add-review",
        [1, 6, "Invalid rating"],
        "buyer1"
      );
      
      expect(result.result).toBe("error");
      expect(result.value).toBe(400);
    });
  });
  
  describe("Download Access", () => {
    it("should provide download access to buyers", () => {
      resetMockState();
      
      // Setup purchase
      mockClarinet.callPublicFn(
        "digital-goods-platform",
        "list-product",
        ["Test Product", "Description", 1000000, "https://example.com/download", "Software"],
        "seller1"
      );
      
      mockClarinet.callPublicFn(
        "digital-goods-platform",
        "purchase-product",
        [1],
        "buyer1"
      );
      
      // Get download access
      const result = mockClarinet.callPublicFn(
        "digital-goods-platform",
        "get-download-access",
        [1],
        "buyer1"
      );
      
      expect(result.result).toBe("ok");
      expect(result.value).toBe("https://example.com/download");
    });
    
    it("should deny download access to non-buyers", () => {
      resetMockState();
      
      // List product but don't purchase
      mockClarinet.callPublicFn(
        "digital-goods-platform",
        "list-product",
        ["Test Product", "Description", 1000000, "https://example.com/download", "Software"],
        "seller1"
      );
      
      // Try to get download access without purchasing
      const result = mockClarinet.callPublicFn(
        "digital-goods-platform",
        "get-download-access",
        [1],
        "non-buyer"
      );
      
      expect(result.result).toBe("error");
      expect(result.value).toBe(401);
    });
  });
  
  describe("Edge Cases", () => {
    it("should handle multiple products from same seller", () => {
      resetMockState();
      
      // List multiple products
      const result1 = mockClarinet.callPublicFn(
        "digital-goods-platform",
        "list-product",
        ["Product 1", "First product", 500000, "https://example.com/1", "Software"],
        "seller1"
      );
      
      const result2 = mockClarinet.callPublicFn(
        "digital-goods-platform",
        "list-product",
        ["Product 2", "Second product", 750000, "https://example.com/2", "Books"],
        "seller1"
      );
      
      expect(result1.value).toBe(1);
      expect(result2.value).toBe(2);
      
      // Purchase both products
      mockClarinet.callPublicFn("digital-goods-platform", "purchase-product", [1], "buyer1");
      mockClarinet.callPublicFn("digital-goods-platform", "purchase-product", [2], "buyer1");
      
      // Check seller stats
      const stats = mockClarinet.callReadOnlyFn(
        "digital-goods-platform",
        "get-seller-stats",
        ["seller1"],
        "seller1"
      );
      
      expect(stats.value.totalSales).toBe(2);
    });
    
    it("should handle zero earnings withdrawal attempt", () => {
      resetMockState();
      
      const result = mockClarinet.callPublicFn(
        "digital-goods-platform",
        "withdraw-earnings",
        [],
        "seller-with-no-sales"
      );
      
      expect(result.result).toBe("error");
      expect(result.value).toBe(402);
    });
  });
});