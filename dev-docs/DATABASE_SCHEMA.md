# FluentCart Database Schema Documentation

This document describes the FluentCart database schema for AI agents to write custom SQL queries and generate store reports.

## Important Notes

### Table Prefix
All FluentCart tables use the prefix `{wp_prefix}fct_` where `{wp_prefix}` is your WordPress table prefix (typically `wp_`).

**Example:** `wp_fct_orders`, `wp_fct_order_items`, etc.

### Money Values
**All monetary values are stored in cents (BIGINT).** To convert to decimal dollars/euros/etc:
```sql
-- Convert cents to decimal
SELECT total_amount / 100 AS total_in_dollars FROM wp_fct_orders;

-- For formatted output with 2 decimal places
SELECT ROUND(total_amount / 100, 2) AS total FROM wp_fct_orders;
```

### Timestamps
All tables use `created_at` and `updated_at` DATETIME columns in MySQL format (`YYYY-MM-DD HH:MM:SS`).

---

## Core Tables

### fct_orders
Main orders table. Central to all reporting queries.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `status` | VARCHAR(20) | Order status: `processing`, `completed`, `on-hold`, `canceled`, `failed` |
| `parent_id` | BIGINT UNSIGNED | Parent order ID (for renewals/child orders) |
| `receipt_number` | BIGINT UNSIGNED | Sequential receipt number |
| `invoice_no` | VARCHAR(192) | Invoice number string |
| `fulfillment_type` | VARCHAR(20) | `physical`, `digital`, `service`, `mixed` |
| `type` | VARCHAR(20) | Order type: `payment` (one-time), `subscription` (initial), `renewal` |
| `mode` | ENUM | `live` or `test` |
| `shipping_status` | VARCHAR(20) | `unshipped`, `shipped`, `delivered`, `unshippable` |
| `customer_id` | BIGINT UNSIGNED | FK to fct_customers.id |
| `payment_method` | VARCHAR(100) | Payment method key (e.g., `stripe`, `paypal`) |
| `payment_status` | VARCHAR(20) | `pending`, `paid`, `partially_paid`, `failed`, `refunded`, `partially_refunded`, `authorized` |
| `payment_method_title` | VARCHAR(100) | Human-readable payment method name |
| `currency` | VARCHAR(10) | ISO currency code (e.g., `USD`, `EUR`) |
| `subtotal` | BIGINT | Subtotal in cents (before discounts/tax) |
| `discount_tax` | BIGINT | Tax on discounted amount in cents |
| `manual_discount_total` | BIGINT | Manual discount amount in cents |
| `coupon_discount_total` | BIGINT | Coupon discount amount in cents |
| `shipping_tax` | BIGINT | Shipping tax in cents |
| `shipping_total` | BIGINT | Shipping cost in cents |
| `tax_total` | BIGINT | Total tax in cents |
| `total_amount` | BIGINT | **Final order total in cents** |
| `total_paid` | BIGINT | Amount paid in cents |
| `total_refund` | BIGINT | Amount refunded in cents |
| `rate` | DECIMAL(12,4) | Currency exchange rate |
| `tax_behavior` | TINYINT(1) | 0 = no_tax, 1 = exclusive, 2 = inclusive |
| `note` | TEXT | Order notes |
| `ip_address` | TEXT | Customer IP address |
| `completed_at` | DATETIME | When order was completed |
| `refunded_at` | DATETIME | When order was refunded |
| `uuid` | VARCHAR(100) | Unique identifier |
| `config` | JSON | Additional configuration |
| `created_at` | DATETIME | Order creation time |
| `updated_at` | DATETIME | Last update time |

**Key Indexes:** `invoice_no`, `type`, `customer_id`, `created_at + completed_at`

---

### fct_order_items
Line items for each order.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `order_id` | BIGINT UNSIGNED | FK to fct_orders.id |
| `post_id` | BIGINT UNSIGNED | WordPress post ID of the product |
| `fulfillment_type` | VARCHAR(20) | `physical`, `digital`, `service` |
| `payment_type` | VARCHAR(20) | `onetime` or `subscription` |
| `post_title` | TEXT | Product title at time of purchase |
| `title` | TEXT | Variation/item title |
| `object_id` | BIGINT UNSIGNED | FK to fct_product_variations.id |
| `cart_index` | BIGINT UNSIGNED | Position in cart |
| `quantity` | INT | Quantity purchased |
| `unit_price` | BIGINT | Price per unit in cents |
| `cost` | BIGINT | Cost of goods in cents (for profit calculation) |
| `subtotal` | BIGINT | unit_price × quantity in cents |
| `tax_amount` | BIGINT | Tax for this line in cents |
| `shipping_charge` | BIGINT | Shipping for this item in cents |
| `discount_total` | BIGINT | Discount applied in cents |
| `line_total` | BIGINT | **Final line total in cents** |
| `refund_total` | BIGINT | Amount refunded for this line in cents |
| `rate` | BIGINT | Currency rate |
| `other_info` | JSON | Additional item metadata |
| `line_meta` | JSON | Line item metadata (variant attributes, etc.) |
| `fulfilled_quantity` | INT | Quantity shipped/fulfilled |
| `referrer` | TEXT | Referrer URL |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

**Key Indexes:** `order_id + object_id`, `post_id`

---

### fct_order_transactions
Payment transactions (charges, refunds, disputes).

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `order_id` | BIGINT UNSIGNED | FK to fct_orders.id |
| `order_type` | VARCHAR(100) | Order type context |
| `transaction_type` | VARCHAR(192) | `charge`, `refund`, `dispute` |
| `subscription_id` | INT | FK to fct_subscriptions.id (if subscription) |
| `card_last_4` | INT(4) | Last 4 digits of card |
| `card_brand` | VARCHAR(100) | Card brand (visa, mastercard, etc.) |
| `vendor_charge_id` | VARCHAR(192) | Payment gateway's charge/transaction ID |
| `payment_method` | VARCHAR(100) | Payment method key |
| `payment_mode` | VARCHAR(100) | `live` or `test` |
| `payment_method_type` | VARCHAR(100) | Specific payment type (card, bank, etc.) |
| `status` | VARCHAR(20) | `pending`, `succeeded`, `authorized`, `failed`, `refunded`, `dispute_lost` |
| `currency` | VARCHAR(10) | ISO currency code |
| `total` | BIGINT | **Transaction amount in cents** |
| `rate` | BIGINT | Currency rate |
| `uuid` | VARCHAR(100) | Unique identifier |
| `meta` | JSON | Additional transaction metadata |
| `created_at` | DATETIME | Transaction time |
| `updated_at` | DATETIME | Last update time |

**Key Indexes:** `vendor_charge_id`, `payment_method`, `status`, `order_id`

---

### fct_subscriptions
Subscription records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `uuid` | VARCHAR(100) | Unique identifier |
| `customer_id` | BIGINT UNSIGNED | FK to fct_customers.id |
| `parent_order_id` | BIGINT UNSIGNED | FK to fct_orders.id (initial order) |
| `product_id` | BIGINT UNSIGNED | WordPress post ID |
| `item_name` | TEXT | Subscription item name |
| `quantity` | INT | Quantity |
| `variation_id` | BIGINT UNSIGNED | FK to fct_product_variations.id |
| `billing_interval` | VARCHAR(45) | `daily`, `weekly`, `monthly`, `quarterly`, `half_yearly`, `yearly` |
| `signup_fee` | BIGINT UNSIGNED | One-time signup fee in cents |
| `initial_tax_total` | BIGINT UNSIGNED | Tax on initial payment in cents |
| `recurring_amount` | BIGINT UNSIGNED | Recurring amount in cents (before tax) |
| `recurring_tax_total` | BIGINT UNSIGNED | Tax on recurring amount in cents |
| `recurring_total` | BIGINT UNSIGNED | **Total recurring charge in cents** |
| `bill_times` | BIGINT UNSIGNED | Total billing cycles (0 = unlimited) |
| `bill_count` | INT UNSIGNED | Number of completed billing cycles |
| `expire_at` | DATETIME | When subscription expires |
| `trial_ends_at` | DATETIME | When trial period ends |
| `canceled_at` | DATETIME | When subscription was canceled |
| `restored_at` | DATETIME | When subscription was restored |
| `collection_method` | ENUM | `automatic`, `manual`, `system` |
| `next_billing_date` | DATETIME | Next scheduled billing date |
| `trial_days` | INT UNSIGNED | Length of trial in days |
| `vendor_customer_id` | VARCHAR(45) | Payment gateway's customer ID |
| `vendor_plan_id` | VARCHAR(45) | Payment gateway's plan ID |
| `vendor_subscription_id` | VARCHAR(45) | Payment gateway's subscription ID |
| `status` | VARCHAR(45) | See subscription statuses below |
| `original_plan` | LONGTEXT | Original plan data |
| `vendor_response` | LONGTEXT | Gateway response data |
| `current_payment_method` | VARCHAR(45) | Current payment method |
| `config` | JSON | Additional configuration |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

**Subscription Statuses:**
- `pending` - Awaiting initial payment
- `intended` - Payment intent created
- `trialing` - In trial period
- `active` - Active and billing
- `failing` - Payment retry in progress
- `paused` - Temporarily paused
- `past_due` - Payment overdue
- `expiring` - About to expire
- `canceled` - Canceled by user/admin
- `expired` - Billing period ended
- `completed` - All billing cycles completed

---

### fct_customers
Customer records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `user_id` | BIGINT UNSIGNED | WordPress user ID (nullable for guests) |
| `contact_id` | BIGINT UNSIGNED | External contact ID (integrations) |
| `email` | VARCHAR(192) | Customer email |
| `first_name` | VARCHAR(192) | First name |
| `last_name` | VARCHAR(192) | Last name |
| `status` | VARCHAR(45) | `active` or `inactive` |
| `purchase_value` | JSON | Purchase analytics by currency |
| `purchase_count` | BIGINT UNSIGNED | Total number of purchases |
| `ltv` | BIGINT | **Lifetime value in cents** |
| `first_purchase_date` | DATETIME | First purchase timestamp |
| `last_purchase_date` | DATETIME | Most recent purchase timestamp |
| `aov` | DECIMAL(18,2) | Average order value |
| `notes` | LONGTEXT | Admin notes |
| `uuid` | VARCHAR(100) | Unique identifier |
| `country` | VARCHAR(45) | Country code |
| `city` | VARCHAR(45) | City |
| `state` | VARCHAR(45) | State/region |
| `postcode` | VARCHAR(45) | Postal code |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

**Key Indexes:** `email`, `user_id`

---

### fct_product_variations
Product variations/SKUs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `post_id` | BIGINT UNSIGNED | WordPress post ID of parent product |
| `media_id` | BIGINT UNSIGNED | Featured image attachment ID |
| `serial_index` | INT | Display order |
| `sold_individually` | TINYINT(1) | Limit to 1 per order |
| `variation_title` | VARCHAR(192) | Variation name |
| `variation_identifier` | VARCHAR(100) | SKU/identifier |
| `manage_stock` | TINYINT(1) | Stock management enabled |
| `payment_type` | VARCHAR(50) | `onetime` or `subscription` |
| `stock_status` | VARCHAR(30) | `instock`, `outofstock`, `onbackorder` |
| `backorders` | TINYINT(1) | Allow backorders |
| `total_stock` | INT | Total inventory |
| `on_hold` | INT | Reserved stock (in carts) |
| `committed` | INT | Stock in unfulfilled orders |
| `available` | INT | Available for sale |
| `fulfillment_type` | VARCHAR(100) | `physical`, `digital`, `service`, `mixed` |
| `item_status` | VARCHAR(30) | `active`, etc. |
| `manage_cost` | VARCHAR(30) | Track cost of goods |
| `item_price` | DOUBLE | **Price in currency units (NOT cents)** |
| `item_cost` | DOUBLE | Cost in currency units |
| `compare_price` | DOUBLE | Compare-at price |
| `shipping_class` | BIGINT | FK to fct_shipping_classes.id |
| `other_info` | LONGTEXT | Additional metadata (JSON) |
| `downloadable` | VARCHAR(30) | Has downloads |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

**Note:** `item_price` is stored in currency units (dollars), not cents, unlike order values.

---

### fct_product_details
Product-level metadata.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `post_id` | BIGINT UNSIGNED | WordPress post ID |
| `fulfillment_type` | VARCHAR(100) | `physical`, `digital`, `service`, `mixed` |
| `min_price` | DOUBLE | Lowest variation price |
| `max_price` | DOUBLE | Highest variation price |
| `default_variation_id` | BIGINT UNSIGNED | Default variation FK |
| `default_media` | JSON | Default media data |
| `manage_stock` | TINYINT(1) | Stock management enabled |
| `stock_availability` | VARCHAR(100) | `in-stock`, `out-of-stock`, `backorder` |
| `variation_type` | VARCHAR(30) | `simple`, `simple_variation`, `advance_variation` |
| `manage_downloadable` | TINYINT(1) | Has downloadable files |
| `other_info` | JSON | Additional metadata |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

---

### fct_coupons
Coupon/discount codes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `title` | VARCHAR(200) | Coupon name |
| `code` | VARCHAR(50) | Coupon code (unique) |
| `priority` | INT | Application priority |
| `type` | VARCHAR(20) | Discount type (`percent`, `fixed`, etc.) |
| `conditions` | JSON | Usage conditions/rules |
| `amount` | DOUBLE | Discount amount |
| `use_count` | INT | Times used |
| `status` | VARCHAR(20) | `active`, `inactive`, etc. |
| `notes` | LONGTEXT | Admin notes |
| `stackable` | VARCHAR(3) | `yes` or `no` |
| `show_on_checkout` | VARCHAR(3) | `yes` or `no` |
| `start_date` | TIMESTAMP | Valid from |
| `end_date` | TIMESTAMP | Valid until |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

---

### fct_applied_coupons
Coupons applied to orders.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `order_id` | BIGINT UNSIGNED | FK to fct_orders.id |
| `coupon_id` | BIGINT UNSIGNED | FK to fct_coupons.id |
| `customer_id` | BIGINT UNSIGNED | FK to fct_customers.id |
| `code` | VARCHAR(100) | Coupon code used |
| `amount` | DOUBLE | Discount amount applied |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

---

## Address Tables

### fct_order_addresses
Billing/shipping addresses for orders.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `order_id` | BIGINT UNSIGNED | FK to fct_orders.id |
| `type` | VARCHAR(20) | `billing` or `shipping` |
| `name` | VARCHAR(192) | Full name |
| `address_1` | VARCHAR(192) | Address line 1 |
| `address_2` | VARCHAR(192) | Address line 2 |
| `city` | VARCHAR(192) | City |
| `state` | VARCHAR(192) | State/region |
| `postcode` | VARCHAR(50) | Postal code |
| `country` | VARCHAR(100) | Country code |
| `meta` | JSON | Additional fields (phone, company, etc.) |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

### fct_customer_addresses
Saved customer addresses.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `customer_id` | BIGINT UNSIGNED | FK to fct_customers.id |
| `is_primary` | TINYINT(1) | Default address flag |
| `type` | VARCHAR(20) | `billing` or `shipping` |
| `status` | VARCHAR(20) | `active` or `inactive` |
| `label` | VARCHAR(50) | Address label (Home, Work, etc.) |
| `name` | VARCHAR(192) | Full name |
| `address_1` | VARCHAR(192) | Address line 1 |
| `address_2` | VARCHAR(192) | Address line 2 |
| `city` | VARCHAR(192) | City |
| `state` | VARCHAR(192) | State/region |
| `phone` | VARCHAR(192) | Phone number |
| `email` | VARCHAR(192) | Email |
| `postcode` | VARCHAR(32) | Postal code |
| `country` | VARCHAR(100) | Country code |
| `meta` | JSON | Additional fields |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

---

## Tax Tables

### fct_tax_classes
Tax class definitions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `title` | VARCHAR(192) | Tax class name |
| `slug` | VARCHAR(100) | URL-friendly slug |
| `description` | LONGTEXT | Description |
| `meta` | JSON | Additional metadata |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

### fct_tax_rates
Tax rate definitions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `class_id` | BIGINT UNSIGNED | FK to fct_tax_classes.id |
| `country` | VARCHAR(45) | Country code |
| `state` | VARCHAR(45) | State/region code |
| `postcode` | TEXT | Postcode pattern (can be ranges) |
| `city` | VARCHAR(45) | City name |
| `rate` | VARCHAR(45) | Tax rate percentage |
| `name` | VARCHAR(45) | Tax name |
| `group` | VARCHAR(45) | Tax group |
| `priority` | INT UNSIGNED | Application priority |
| `is_compound` | TINYINT UNSIGNED | Compound tax flag |
| `for_shipping` | TINYINT UNSIGNED | Apply to shipping |
| `for_order` | TINYINT UNSIGNED | Apply to order |

### fct_order_tax_rate
Tax rates applied to specific orders.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `order_id` | BIGINT UNSIGNED | FK to fct_orders.id |
| `tax_rate_id` | BIGINT UNSIGNED | FK to fct_tax_rates.id |
| `shipping_tax` | BIGINT | Shipping tax in cents |
| `order_tax` | BIGINT | Order tax in cents |
| `total_tax` | BIGINT | Total tax in cents |
| `meta` | JSON | Additional metadata |
| `filed_at` | DATETIME | When tax was filed |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

---

## Shipping Tables

### fct_shipping_zones
Shipping zone definitions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `name` | VARCHAR(192) | Zone name |
| `region` | VARCHAR(192) | Region definition |
| `order` | INT UNSIGNED | Display order |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

### fct_shipping_methods
Shipping methods per zone.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `zone_id` | BIGINT UNSIGNED | FK to fct_shipping_zones.id |
| `title` | VARCHAR(192) | Method name |
| `type` | VARCHAR(50) | Method type |
| `settings` | LONGTEXT | Method settings (JSON) |
| `is_enabled` | TINYINT(1) | Active flag |
| `states` | JSON | State restrictions |
| `amount` | BIGINT UNSIGNED | Base cost in cents |
| `order` | INT UNSIGNED | Display order |
| `meta` | JSON | Additional metadata |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

### fct_shipping_classes
Shipping classes for products.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `name` | VARCHAR(192) | Class name |
| `cost` | DECIMAL(10,2) | Additional cost |
| `per_item` | TINYINT(1) | Per-item cost flag |
| `type` | VARCHAR(20) | Cost type (`fixed`, etc.) |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

---

## Product Attributes

### fct_atts_groups
Attribute groups (Color, Size, etc.).

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `title` | VARCHAR(192) | Group name (unique) |
| `slug` | VARCHAR(192) | URL-friendly slug (unique) |
| `description` | LONGTEXT | Description |
| `settings` | LONGTEXT | Settings (JSON) |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

### fct_atts_terms
Attribute terms (Red, Blue, Small, Large, etc.).

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `group_id` | BIGINT UNSIGNED | FK to fct_atts_groups.id |
| `serial` | INT UNSIGNED | Display order |
| `title` | VARCHAR(192) | Term name |
| `slug` | VARCHAR(192) | URL-friendly slug |
| `description` | LONGTEXT | Description |
| `settings` | LONGTEXT | Settings (JSON) |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

### fct_atts_relations
Product-attribute term relationships.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `group_id` | BIGINT UNSIGNED | FK to fct_atts_groups.id |
| `term_id` | BIGINT UNSIGNED | FK to fct_atts_terms.id |
| `object_id` | BIGINT UNSIGNED | FK to fct_product_variations.id |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

---

## Digital Products

### fct_product_downloads
Downloadable files attached to products.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `post_id` | BIGINT UNSIGNED | WordPress post ID |
| `product_variation_id` | LONGTEXT | Variation IDs (JSON) |
| `download_identifier` | VARCHAR(100) | Unique identifier |
| `title` | VARCHAR(192) | File title |
| `type` | VARCHAR(100) | File type |
| `driver` | VARCHAR(100) | Storage driver (`local`, etc.) |
| `file_name` | VARCHAR(192) | Original filename |
| `file_path` | TEXT | Server file path |
| `file_url` | TEXT | Download URL |
| `file_size` | TEXT | File size |
| `settings` | TEXT | Download settings |
| `serial` | INT | Display order |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

### fct_order_download_permissions
Customer download access records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `order_id` | BIGINT UNSIGNED | FK to fct_orders.id |
| `variation_id` | BIGINT UNSIGNED | FK to fct_product_variations.id |
| `download_id` | BIGINT UNSIGNED | FK to fct_product_downloads.id |
| `download_count` | INT | Times downloaded |
| `download_limit` | INT | Max downloads allowed |
| `access_expires` | DATETIME | Access expiration date |
| `customer_id` | BIGINT UNSIGNED | FK to fct_customers.id |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

---

## Utility Tables

### fct_carts
Shopping cart sessions.

| Column | Type | Description |
|--------|------|-------------|
| `customer_id` | BIGINT UNSIGNED | FK to fct_customers.id |
| `user_id` | BIGINT UNSIGNED | WordPress user ID |
| `order_id` | BIGINT UNSIGNED | FK to fct_orders.id (when converted) |
| `cart_hash` | VARCHAR(192) | Unique cart identifier (primary key) |
| `checkout_data` | LONGTEXT | Checkout form data (JSON) |
| `cart_data` | LONGTEXT | Cart items (JSON) |
| `utm_data` | LONGTEXT | Marketing attribution data (JSON) |
| `coupons` | LONGTEXT | Applied coupons (JSON) |
| `first_name` | VARCHAR(192) | Customer first name |
| `last_name` | VARCHAR(192) | Customer last name |
| `email` | VARCHAR(192) | Customer email |
| `stage` | VARCHAR(30) | `draft`, `pending`, `in-complete`, `completed` |
| `cart_group` | VARCHAR(30) | Cart group identifier |
| `user_agent` | VARCHAR(192) | Browser user agent |
| `ip_address` | VARCHAR(50) | IP address |
| `completed_at` | TIMESTAMP | When cart converted to order |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |
| `deleted_at` | TIMESTAMP | Soft delete timestamp |

### fct_order_operations
Order operational data and UTM tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `order_id` | BIGINT UNSIGNED | FK to fct_orders.id |
| `created_via` | VARCHAR(45) | Order source |
| `emails_sent` | TINYINT(1) | Emails dispatched flag |
| `sales_recorded` | TINYINT(1) | Revenue recorded flag |
| `utm_campaign` | VARCHAR(192) | UTM campaign |
| `utm_term` | VARCHAR(192) | UTM term |
| `utm_source` | VARCHAR(192) | UTM source |
| `utm_medium` | VARCHAR(192) | UTM medium |
| `utm_content` | VARCHAR(192) | UTM content |
| `utm_id` | VARCHAR(192) | UTM ID |
| `cart_hash` | VARCHAR(192) | Original cart hash |
| `refer_url` | VARCHAR(192) | Referrer URL |
| `meta` | JSON | Additional metadata |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

### fct_activity
Activity log/audit trail.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `status` | VARCHAR(20) | `success`, `warning`, `failed`, `info` |
| `log_type` | VARCHAR(20) | `activity`, `api` |
| `module_type` | VARCHAR(100) | Full model class path |
| `module_id` | BIGINT | Related object ID |
| `module_name` | VARCHAR(192) | `order`, `product`, `user`, `coupon`, `subscription`, etc. |
| `user_id` | BIGINT UNSIGNED | Acting user ID |
| `title` | VARCHAR(192) | Log title |
| `content` | LONGTEXT | Log content |
| `read_status` | VARCHAR(20) | `read` or `unread` |
| `created_by` | VARCHAR(100) | Creator name or `FCT-BOT` |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

### fct_meta
General key-value storage.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `object_type` | VARCHAR(50) | Object type (`option`, etc.) |
| `object_id` | BIGINT | Related object ID |
| `meta_key` | VARCHAR(192) | Key name |
| `meta_value` | LONGTEXT | Value |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

### fct_label
Labels/tags for organization.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `value` | VARCHAR(192) | Label text (unique) |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

### fct_label_relationships
Object-label associations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `label_id` | BIGINT | FK to fct_label.id |
| `labelable_id` | BIGINT | Related object ID |
| `labelable_type` | VARCHAR(192) | Object type (model class) |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

### fct_scheduled_actions
Background job queue.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `scheduled_at` | DATETIME | When to execute |
| `action` | VARCHAR(192) | Action name |
| `status` | VARCHAR(20) | `pending`, `processing`, `completed`, `failed` |
| `group` | VARCHAR(100) | `order`, `subscription`, etc. |
| `object_id` | BIGINT UNSIGNED | Related object ID |
| `object_type` | VARCHAR(100) | Object type |
| `completed_at` | TIMESTAMP | Completion time |
| `retry_count` | INT UNSIGNED | Retry attempts |
| `data` | JSON | Action data |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |
| `response_note` | LONGTEXT | Execution result |

### fct_retention_snapshots
Subscription retention analytics (pre-computed).

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `cohort` | VARCHAR(7) | YYYY-MM format (first subscription month) |
| `period` | VARCHAR(7) | YYYY-MM format (measurement month) |
| `product_id` | BIGINT UNSIGNED | Product ID (NULL = all products) |
| `cohort_customers` | INT UNSIGNED | Customers at cohort start |
| `cohort_mrr` | BIGINT UNSIGNED | MRR at cohort start in cents |
| `retained_customers` | INT UNSIGNED | Customers retained at period |
| `retained_mrr` | BIGINT UNSIGNED | MRR retained at period in cents |
| `new_customers` | INT UNSIGNED | Returned customers |
| `churned_customers` | INT UNSIGNED | Churned in period |
| `retention_rate_customers` | DECIMAL(5,2) | Customer retention percentage |
| `retention_rate_mrr` | DECIMAL(5,2) | MRR retention percentage |
| `period_offset` | INT UNSIGNED | Months since cohort |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

### fct_webhook_logger
Incoming webhook logs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `source` | VARCHAR(20) | Webhook source (stripe, paypal) |
| `event_type` | VARCHAR(100) | Event type |
| `payload` | LONGTEXT | Raw payload |
| `status` | VARCHAR(20) | Processing status |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

---

## Meta Tables

### fct_order_meta
Order metadata key-value pairs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `order_id` | BIGINT | FK to fct_orders.id |
| `meta_key` | VARCHAR(192) | Key name |
| `meta_value` | LONGTEXT | Value |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

### fct_customer_meta
Customer metadata key-value pairs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `customer_id` | BIGINT UNSIGNED | FK to fct_customers.id |
| `meta_key` | VARCHAR(192) | Key name |
| `meta_value` | LONGTEXT | Value |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

### fct_subscription_meta
Subscription metadata key-value pairs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `subscription_id` | BIGINT UNSIGNED | FK to fct_subscriptions.id |
| `meta_key` | VARCHAR(192) | Key name |
| `meta_value` | LONGTEXT | Value |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

### fct_product_meta
Product/variation metadata.

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT UNSIGNED | Primary key |
| `object_id` | BIGINT UNSIGNED | Product or variation ID |
| `object_type` | VARCHAR(192) | Object type |
| `meta_key` | VARCHAR(192) | Key name |
| `meta_value` | LONGTEXT | Value |
| `created_at` | DATETIME | Creation time |
| `updated_at` | DATETIME | Last update time |

---

## Common Report Queries

### Total Revenue (Completed Orders)
```sql
SELECT
    SUM(total_amount) / 100 AS total_revenue,
    SUM(total_refund) / 100 AS total_refunds,
    (SUM(total_amount) - SUM(total_refund)) / 100 AS net_revenue
FROM wp_fct_orders
WHERE payment_status IN ('paid', 'partially_refunded')
    AND mode = 'live';
```

### Daily Sales Report
```sql
SELECT
    DATE(created_at) AS date,
    COUNT(*) AS order_count,
    SUM(total_amount) / 100 AS gross_sales,
    SUM(total_refund) / 100 AS refunds,
    (SUM(total_amount) - SUM(total_refund)) / 100 AS net_sales
FROM wp_fct_orders
WHERE payment_status IN ('paid', 'partially_refunded', 'partially_paid')
    AND mode = 'live'
    AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Top Products by Revenue
```sql
SELECT
    oi.post_title AS product_name,
    SUM(oi.quantity) AS units_sold,
    SUM(oi.line_total) / 100 AS revenue
FROM wp_fct_order_items oi
JOIN wp_fct_orders o ON oi.order_id = o.id
WHERE o.payment_status IN ('paid', 'partially_refunded')
    AND o.mode = 'live'
GROUP BY oi.post_id
ORDER BY revenue DESC
LIMIT 10;
```

### Active Subscriptions by Plan
```sql
SELECT
    billing_interval,
    COUNT(*) AS active_count,
    SUM(recurring_total) / 100 AS mrr
FROM wp_fct_subscriptions
WHERE status IN ('active', 'trialing')
GROUP BY billing_interval;
```

### Customer Lifetime Value
```sql
SELECT
    c.id,
    c.email,
    c.first_name,
    c.last_name,
    c.ltv / 100 AS lifetime_value,
    c.purchase_count,
    c.first_purchase_date,
    c.last_purchase_date
FROM wp_fct_customers c
WHERE c.ltv > 0
ORDER BY c.ltv DESC
LIMIT 100;
```

### Revenue by Payment Method
```sql
SELECT
    payment_method,
    COUNT(*) AS order_count,
    SUM(total_amount) / 100 AS total_revenue
FROM wp_fct_orders
WHERE payment_status IN ('paid', 'partially_refunded')
    AND mode = 'live'
GROUP BY payment_method
ORDER BY total_revenue DESC;
```

### Monthly Recurring Revenue (MRR)
```sql
SELECT
    SUM(CASE
        WHEN billing_interval = 'monthly' THEN recurring_total
        WHEN billing_interval = 'yearly' THEN recurring_total / 12
        WHEN billing_interval = 'quarterly' THEN recurring_total / 3
        WHEN billing_interval = 'half_yearly' THEN recurring_total / 6
        WHEN billing_interval = 'weekly' THEN recurring_total * 4.33
        WHEN billing_interval = 'daily' THEN recurring_total * 30
        ELSE 0
    END) / 100 AS mrr
FROM wp_fct_subscriptions
WHERE status IN ('active', 'trialing');
```

### Orders by Country
```sql
SELECT
    oa.country,
    COUNT(DISTINCT o.id) AS order_count,
    SUM(o.total_amount) / 100 AS revenue
FROM wp_fct_orders o
JOIN wp_fct_order_addresses oa ON o.id = oa.order_id AND oa.type = 'billing'
WHERE o.payment_status IN ('paid', 'partially_refunded')
    AND o.mode = 'live'
GROUP BY oa.country
ORDER BY revenue DESC;
```

### Coupon Usage Report
```sql
SELECT
    ac.code,
    COUNT(*) AS times_used,
    SUM(ac.amount) AS total_discount,
    SUM(o.total_amount) / 100 AS revenue_generated
FROM wp_fct_applied_coupons ac
JOIN wp_fct_orders o ON ac.order_id = o.id
WHERE o.payment_status IN ('paid', 'partially_refunded')
GROUP BY ac.code
ORDER BY times_used DESC;
```

### Churn Analysis (Last 30 Days)
```sql
SELECT
    COUNT(*) AS churned_subscriptions,
    SUM(recurring_total) / 100 AS lost_mrr
FROM wp_fct_subscriptions
WHERE status = 'canceled'
    AND canceled_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY);
```

---

## Status Reference

### Order Status (`fct_orders.status`)
| Value | Description |
|-------|-------------|
| `processing` | Order received, awaiting fulfillment |
| `completed` | Order fulfilled |
| `on-hold` | Awaiting action |
| `canceled` | Order canceled |
| `failed` | Payment or processing failed |

### Payment Status (`fct_orders.payment_status`)
| Value | Description |
|-------|-------------|
| `pending` | Awaiting payment |
| `paid` | Fully paid |
| `partially_paid` | Partial payment received |
| `failed` | Payment failed |
| `refunded` | Fully refunded |
| `partially_refunded` | Partially refunded |
| `authorized` | Payment authorized, not captured |

### Shipping Status (`fct_orders.shipping_status`)
| Value | Description |
|-------|-------------|
| `unshipped` | Not yet shipped |
| `shipped` | In transit |
| `delivered` | Delivered |
| `unshippable` | Digital/service item |

### Transaction Status (`fct_order_transactions.status`)
| Value | Description |
|-------|-------------|
| `pending` | Processing |
| `succeeded` | Successful |
| `authorized` | Authorized only |
| `failed` | Failed |
| `refunded` | Refunded |
| `dispute_lost` | Chargeback lost |

### Subscription Status (`fct_subscriptions.status`)
| Value | Description |
|-------|-------------|
| `pending` | Awaiting initial payment |
| `intended` | Payment intent created |
| `trialing` | In trial period |
| `active` | Active subscription |
| `failing` | Payment retry in progress |
| `paused` | Temporarily paused |
| `past_due` | Payment overdue |
| `expiring` | About to expire |
| `canceled` | Canceled |
| `expired` | Ended |
| `completed` | All cycles completed |

### Order Type (`fct_orders.type`)
| Value | Description |
|-------|-------------|
| `payment` | One-time purchase |
| `subscription` | Initial subscription order |
| `renewal` | Subscription renewal |
