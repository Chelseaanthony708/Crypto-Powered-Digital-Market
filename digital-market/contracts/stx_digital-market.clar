;; Digital Goods Distribution Platform
;; A smart contract for managing digital goods sales and distribution

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_NOT_AUTHORIZED (err u401))
(define-constant ERR_NOT_FOUND (err u404))
(define-constant ERR_INSUFFICIENT_FUNDS (err u402))
(define-constant ERR_ALREADY_EXISTS (err u409))
(define-constant ERR_INVALID_PRICE (err u400))
(define-constant ERR_PRODUCT_INACTIVE (err u403))

;; Data Variables
(define-data-var platform-fee-percentage uint u250) ;; 2.5% in basis points (250/10000)
(define-data-var next-product-id uint u1)

;; Data Maps
(define-map products 
    uint ;; product-id
    {
        seller: principal,
        title: (string-ascii 100),
        description: (string-ascii 500),
        price: uint,
        download-url: (string-ascii 200),
        category: (string-ascii 50),
        is-active: bool,
        total-sales: uint,
        created-at: uint
    }
)

(define-map purchases
    {buyer: principal, product-id: uint}
    {
        purchase-price: uint,
        purchased-at: uint,
        transaction-id: (optional (buff 32))
    }
)

(define-map seller-earnings
    principal
    {
        total-earned: uint,
        total-sales: uint,
        available-balance: uint
    }
)

(define-map product-reviews
    {product-id: uint, reviewer: principal}
    {
        rating: uint, ;; 1-5 stars
        review-text: (string-ascii 300),
        reviewed-at: uint
    }
)

;; Read-only functions

(define-read-only (get-product (product-id uint))
    (map-get? products product-id)
)

(define-read-only (get-purchase (buyer principal) (product-id uint))
    (map-get? purchases {buyer: buyer, product-id: product-id})
)

(define-read-only (has-purchased (buyer principal) (product-id uint))
    (is-some (map-get? purchases {buyer: buyer, product-id: product-id}))
)

(define-read-only (get-seller-stats (seller principal))
    (default-to 
        {total-earned: u0, total-sales: u0, available-balance: u0}
        (map-get? seller-earnings seller)
    )
)

(define-read-only (get-platform-fee-percentage)
    (var-get platform-fee-percentage)
)

(define-read-only (calculate-platform-fee (price uint))
    (/ (* price (var-get platform-fee-percentage)) u10000)
)

(define-read-only (calculate-seller-earnings (price uint))
    (- price (calculate-platform-fee price))
)

(define-read-only (get-product-review (product-id uint) (reviewer principal))
    (map-get? product-reviews {product-id: product-id, reviewer: reviewer})
)

;; Public functions

(define-public (list-product 
    (title (string-ascii 100))
    (description (string-ascii 500))
    (price uint)
    (download-url (string-ascii 200))
    (category (string-ascii 50))
)
    (let 
        (
            (product-id (var-get next-product-id))
        )
        (asserts! (> price u0) ERR_INVALID_PRICE)
        (asserts! (> (len title) u0) ERR_INVALID_PRICE)
        
        (map-set products product-id
            {
                seller: tx-sender,
                title: title,
                description: description,
                price: price,
                download-url: download-url,
                category: category,
                is-active: true,
                total-sales: u0,
                created-at: stacks-block-height
            }
        )
        
        (var-set next-product-id (+ product-id u1))
        (ok product-id)
    )
)

(define-public (update-product
    (product-id uint)
    (title (string-ascii 100))
    (description (string-ascii 500))
    (price uint)
    (download-url (string-ascii 200))
    (category (string-ascii 50))
    (is-active bool)
)
    (let 
        (
            (product (unwrap! (map-get? products product-id) ERR_NOT_FOUND))
        )
        (asserts! (is-eq tx-sender (get seller product)) ERR_NOT_AUTHORIZED)
        (asserts! (> price u0) ERR_INVALID_PRICE)
        
        (map-set products product-id
            (merge product
                {
                    title: title,
                    description: description,
                    price: price,
                    download-url: download-url,
                    category: category,
                    is-active: is-active
                }
            )
        )
        (ok true)
    )
)

(define-public (purchase-product (product-id uint))
            (let 
        (
            (product (unwrap! (map-get? products product-id) ERR_NOT_FOUND))
            (price (get price product))
            (seller (get seller product))
            (platform-fee (calculate-platform-fee price))
            (seller-payout (calculate-seller-earnings price))
            (current-seller-stats (get-seller-stats seller))
        )
        (asserts! (get is-active product) ERR_PRODUCT_INACTIVE)
        (asserts! (not (has-purchased tx-sender product-id)) ERR_ALREADY_EXISTS)
        
        ;; Transfer payment
        (try! (stx-transfer? price tx-sender (as-contract tx-sender)))
        
        ;; Record purchase
        (map-set purchases 
            {buyer: tx-sender, product-id: product-id}
            {
                purchase-price: price,
                purchased-at: stacks-block-height,
                transaction-id: none
            }
        )
        
        ;; Update product sales
        (map-set products product-id
            (merge product {total-sales: (+ (get total-sales product) u1)})
        )
        
        ;; Update seller earnings
        (map-set seller-earnings seller
            {
                total-earned: (+ (get total-earned current-seller-stats) seller-payout),
                total-sales: (+ (get total-sales current-seller-stats) u1),
                available-balance: (+ (get available-balance current-seller-stats) seller-payout)
            }
        )
        
        (ok true)
    )
)

(define-public (withdraw-earnings)
    (let 
        (
            (seller-stats (get-seller-stats tx-sender))
            (available-balance (get available-balance seller-stats))
        )
        (asserts! (> available-balance u0) ERR_INSUFFICIENT_FUNDS)
        
        ;; Transfer earnings to seller
        (try! (as-contract (stx-transfer? available-balance tx-sender tx-sender)))
        
        ;; Update seller balance
        (map-set seller-earnings tx-sender
            (merge seller-stats {available-balance: u0})
        )
        
        (ok available-balance)
    )
)

(define-public (add-review 
    (product-id uint)
    (rating uint)
    (review-text (string-ascii 300))
)
    (let 
        (
            (product (unwrap! (map-get? products product-id) ERR_NOT_FOUND))
        )
        (asserts! (has-purchased tx-sender product-id) ERR_NOT_AUTHORIZED)
        (asserts! (and (>= rating u1) (<= rating u5)) ERR_INVALID_PRICE)
        
        (map-set product-reviews 
            {product-id: product-id, reviewer: tx-sender}
            {
                rating: rating,
                review-text: review-text,
                reviewed-at: stacks-block-height
            }
        )
        (ok true)
    )
)

(define-public (get-download-access (product-id uint))
    (let 
        (
            (product (unwrap! (map-get? products product-id) ERR_NOT_FOUND))
            (purchase (unwrap! (get-purchase tx-sender product-id) ERR_NOT_AUTHORIZED))
        )
        (ok (get download-url product))
    )
)

;; Admin functions

(define-public (set-platform-fee (new-fee-percentage uint))
    (begin
        (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
        (asserts! (<= new-fee-percentage u1000) ERR_INVALID_PRICE) ;; Max 10%
        (var-set platform-fee-percentage new-fee-percentage)
        (ok true)
    )
)

(define-public (withdraw-platform-fees)
    (begin
        (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
        (let 
            (
                (contract-balance (stx-get-balance (as-contract tx-sender)))
            )
            (try! (as-contract (stx-transfer? contract-balance tx-sender CONTRACT_OWNER)))
            (ok contract-balance)
        )
    )
)

(define-public (deactivate-product (product-id uint))
    (let 
        (
            (product (unwrap! (map-get? products product-id) ERR_NOT_FOUND))
        )
        (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
        
        (map-set products product-id
            (merge product {is-active: false})
        )
        (ok true)
    )
)