# Digital Goods Distribution Platform

A decentralized smart contract built on the Stacks blockchain for selling and distributing digital goods. This platform enables creators to list their digital products, buyers to purchase with STX tokens, and provides a complete marketplace experience with reviews, earnings management, and secure download access.

## 🚀 Features

### Core Functionality
- **Product Listing**: Sellers can list digital products with metadata, pricing, and download links
- **Secure Purchasing**: Buyers purchase products using STX tokens with automatic payment processing
- **Access Control**: Only verified buyers can access download URLs for purchased products
- **Earnings Management**: Sellers can track and withdraw their earnings minus platform fees

### Advanced Features
- **Review System**: Buyers can rate (1-5 stars) and review purchased products
- **Sales Analytics**: Track total sales per product and comprehensive seller statistics
- **Platform Fees**: Configurable platform fee system (default 2.5%)
- **Product Management**: Sellers can update listings and control product availability
- **Admin Controls**: Platform owner can manage fees and moderate content

## 🏗️ Architecture

### Smart Contract Structure
```
Digital Goods Platform
├── Product Management
│   ├── Product Listing
│   ├── Product Updates
│   └── Product Deactivation
├── Purchase System
│   ├── STX Payment Processing
│   ├── Purchase Verification
│   └── Download Access Control
├── Review System
│   ├── Rating System (1-5 stars)
│   └── Review Text Storage
├── Earnings Management
│   ├── Fee Calculation
│   ├── Seller Payouts
│   └── Withdrawal System
└── Admin Functions
    ├── Platform Fee Management
    ├── Fee Collection
    └── Content Moderation
```

### Data Models

#### Product
```clarity
{
  seller: principal,
  title: string-ascii(100),
  description: string-ascii(500),
  price: uint,
  download-url: string-ascii(200),
  category: string-ascii(50),
  is-active: bool,
  total-sales: uint,
  created-at: uint
}
```

#### Purchase
```clarity
{
  buyer: principal,
  product-id: uint,
  purchase-price: uint,
  purchased-at: uint,
  transaction-id: optional(buff(32))
}
```

#### Review
```clarity
{
  product-id: uint,
  reviewer: principal,
  rating: uint,
  review-text: string-ascii(300),
  reviewed-at: uint
}
```

## 🛠️ Installation & Setup

### Prerequisites
- [Clarinet](https://github.com/hirosystems/clarinet) installed
- Node.js (for testing)
- Stacks wallet for deployment

### Local Development
```bash
# Clone the repository
git clone <repository-url>
cd digital-goods-platform

# Initialize Clarinet project
clarinet new digital-goods-platform
cd digital-goods-platform

# Add the contract
cp path/to/digital-goods.clar contracts/

# Check contract syntax
clarinet check

# Run tests
clarinet test

# Start local blockchain
clarinet integrate
```

### Testing
```bash
# Install test dependencies
npm install

# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```

## 📖 Usage Examples

### For Sellers

#### List a Product
```clarity
(contract-call? .digital-goods-platform list-product
  "My Digital Course"
  "Complete web development course with 50+ hours of content"
  u10000000  ;; 10 STX
  "https://cdn.example.com/course-download"
  "Education"
)
```

#### Update Product
```clarity
(contract-call? .digital-goods-platform update-product
  u1  ;; product-id
  "Updated Course Title"
  "Updated description"
  u12000000  ;; new price: 12 STX
  "https://cdn.example.com/updated-download"
  "Education"
  true  ;; is-active
)
```

#### Withdraw Earnings
```clarity
(contract-call? .digital-goods-platform withdraw-earnings)
```

### For Buyers

#### Purchase a Product
```clarity
(contract-call? .digital-goods-platform purchase-product u1)
```

#### Access Download
```clarity
(contract-call? .digital-goods-platform get-download-access u1)
```

#### Add Review
```clarity
(contract-call? .digital-goods-platform add-review
  u1  ;; product-id
  u5  ;; rating (1-5 stars)
  "Excellent course! Highly recommended."
)
```

### Read-Only Functions

#### Check Product Details
```clarity
(contract-call? .digital-goods-platform get-product u1)
```

#### Verify Purchase
```clarity
(contract-call? .digital-goods-platform has-purchased 'ST1BUYER123... u1)
```

#### Get Seller Statistics
```clarity
(contract-call? .digital-goods-platform get-seller-stats 'ST1SELLER123...)
```

## 💰 Fee Structure

- **Platform Fee**: 2.5% (250 basis points) by default
- **Seller Earnings**: 97.5% of the sale price
- **Fee Calculation**: Automatic and transparent
- **Admin Control**: Platform owner can adjust fees (max 10%)

### Fee Calculation Example
```
Product Price: 10 STX (10,000,000 µSTX)
Platform Fee: 0.25 STX (250,000 µSTX)
Seller Receives: 9.75 STX (9,750,000 µSTX)
```

## 🔒 Security Features

### Access Control
- **Seller Authorization**: Only product owners can update their listings
- **Purchase Verification**: Only verified buyers can access downloads
- **Admin Functions**: Critical functions restricted to contract owner

### Input Validation
- Price validation (must be > 0)
- Title length validation
- Rating bounds (1-5 stars)
- Duplicate purchase prevention

### Error Handling
- `ERR_NOT_AUTHORIZED (401)`: Unauthorized access
- `ERR_NOT_FOUND (404)`: Product/purchase not found
- `ERR_INSUFFICIENT_FUNDS (402)`: Insufficient balance
- `ERR_ALREADY_EXISTS (409)`: Duplicate purchase attempt
- `ERR_INVALID_PRICE (400)`: Invalid price or rating
- `ERR_PRODUCT_INACTIVE (403)`: Product not active

## 🧪 Testing

The project includes comprehensive unit tests covering:

- Product listing and management
- Purchase workflows
- Earnings calculations
- Review system
- Access control
- Error conditions
- Edge cases

Run tests with:
```bash
npm test
```

## 🚀 Deployment

### Testnet Deployment
```bash
# Deploy to testnet
clarinet publish --testnet

# Verify deployment
clarinet console --testnet
```

### Mainnet Deployment
```bash
# Deploy to mainnet (requires mainnet STX)
clarinet publish --mainnet
```

## 📊 API Reference

### Public Functions

| Function | Parameters | Description |
|----------|------------|-------------|
| `list-product` | title, description, price, download-url, category | List a new digital product |
| `update-product` | product-id, title, description, price, download-url, category, is-active | Update existing product |
| `purchase-product` | product-id | Purchase a digital product |
| `withdraw-earnings` | - | Withdraw available seller earnings |
| `add-review` | product-id, rating, review-text | Add product review |
| `get-download-access` | product-id | Get download URL for purchased product |

### Read-Only Functions

| Function | Parameters | Description |
|----------|------------|-------------|
| `get-product` | product-id | Get product details |
| `get-purchase` | buyer, product-id | Get purchase details |
| `has-purchased` | buyer, product-id | Check if user purchased product |
| `get-seller-stats` | seller | Get seller earnings and sales stats |
| `get-platform-fee-percentage` | - | Get current platform fee percentage |
| `calculate-platform-fee` | price | Calculate fee for given price |
| `get-product-review` | product-id, reviewer | Get specific product review |

### Admin Functions

| Function | Parameters | Description |
|----------|------------|-------------|
| `set-platform-fee` | new-fee-percentage | Set platform fee (max 10%) |
| `withdraw-platform-fees` | - | Withdraw collected platform fees |
| `deactivate-product` | product-id | Deactivate a product |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow Clarity best practices
- Add comprehensive tests for new features
- Update documentation for API changes
- Ensure all tests pass before submitting PR

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Documentation**: [Wiki](https://github.com/your-repo/wiki)

## 🙏 Acknowledgments

- Built on [Stacks Blockchain](https://stacks.co/)
- Developed with [Clarinet](https://github.com/hirosystems/clarinet)
- Inspired by decentralized marketplace principles

---

**⚠️ Disclaimer**: This smart contract is provided as-is. Please audit thoroughly before using in production with real funds.