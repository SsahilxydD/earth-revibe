[Payments](https://razorpay.com/docs/payments)

Magic Checkout

Rto Intelligence

# RTO Intelligence

Reduce RTOs with the API-based solution to assess RTO risk for your orders and take necessary actions.

Available in

![IN](https://flagcdn.com/in.svg)

India

* * *

With Razorpay Magic Checkout, you can lower RTO (Return To Origin) rates by assessing the likelihood of RTO for incoming orders in real time. Based on the data, you can make decisions during order placement, such as disabling the COD option. Additionally, you can use post-order data to determine whether to ship the order or take further action.

**Handy Tips**

This is an on-demand feature. Write to us at

[magic-checkout-support@razorpay.com](mailto:magic-checkout-support@razorpay.com)

to get this feature enabled on your account.

## [Use Cases](https://razorpay.com/docs/payments/magic-checkout/rto-intelligence/\#use-cases)

Here are some examples of how you can leverage RTO Intelligence.

- **Custom Checkout Experience**


Businesses with custom-built stores and a dedicated checkout experience can greatly benefit from Magic Checkout. They can opt for RTO intelligence as it is a separate offering, allowing them to maintain complete control of the checkout process while effectively addressing their RTO challenges.

- **Website or App**


Businesses operating exclusively through websites, apps, or both can benefit substantially from RTO Intelligence. Smaller businesses with limited engineering resources can easily use RTO Intelligence, an API-based solution requiring minimal integration.

- **Logistics Partners and Aggregators**


These partners are essential for order fulfilment, processing a high volume of orders daily, and collecting customer data. While they have access to this data, they may need more expertise to build their own RTO solutions. This is where RTO Intelligence can help them enhance their capabilities.


## [Prerequisites](https://razorpay.com/docs/payments/magic-checkout/rto-intelligence/\#prerequisites)

- Create a
[Razorpay account](https://dashboard.razorpay.com/signup)
.
- Generate the
[API keys](https://razorpay.com/docs/api/authentication/#generate-api-keys)
from the Dashboard. You can use the **Test Mode** keys for testing and later switch to **Live Mode**, generate the
[Live API keys](https://razorpay.com/docs/api/authentication/#live-mode-api-keys)
and replace it with the test keys.

## [Integration Steps](https://razorpay.com/docs/payments/magic-checkout/rto-intelligence/\#integration-steps)

Perform the following integration steps:

1. [Create an Order](https://razorpay.com/docs/payments/magic-checkout/rto-intelligence/#step-1-create-an-order)
.

2. [View RTO/Risk Reasons](https://razorpay.com/docs/payments/magic-checkout/rto-intelligence/#step-2-view-rto-risk-reasons)
.

3. [Update Fulfilment Details](https://razorpay.com/docs/payments/magic-checkout/rto-intelligence/#step-3-update-fulfilment-details)
.

### [Step 1: Create an Order](https://razorpay.com/docs/payments/magic-checkout/rto-intelligence/\#step-1-create-an-order)

You can create an order using the following API and send the additional information required for Magic Checkout.

Pass the `order_id` received in response in the subsequent API calls as the identifier of the order.

POST

/orders

Request

Response

CurlJavaPythonGoPHPRubyNode.JS.NET

copy

```bash
curl -u [YOUR_KEY_ID]:[YOUR_KEY_SECRET] \

-X POST https://api.razorpay.com/v1/orders \

-H "content-type: application/json" \

-d '{

  "amount": 50000,

  "currency": "USD",

  "receipt": "receipt#22",

  "notes": {

      "key1": "value3",

      "key2": "value2"

  },

  "rto_review": true,

  "line_items": [\
\
      {\
\
          "type": "e-commerce",\
\
          "sku": "1g234",\
\
          "variant_id": "12r34",\
\
          "price": "3900",\
\
          "offer_price": "3800",\
\
          "tax_amount": 0,\
\
          "quantity": 1,\
\
          "name": "TEST",\
\
          "description": "TEST",\
\
          "weight": "1700",\
\
          "dimensions": {\
\
              "length": "1700",\
\
              "width": "1700",\
\
              "height": "1700"\
\
          },\
\
          "image_url": "https://unsplash.com/s/photos/new-wallpaper",\
\
          "product_url": "https://unsplash.com/s/photos/new-wallpaper",\
\
          "notes": {}\
\
      }\
\
  ],

  "line_items_total": "1200",

  "shipping_fee": 100,

  "cod_fee": 100,

  "customer_details": {

      "name": "John Smith",

      "contact": "+919000090000",

      "email": "john.smith@example.com",

      "shipping_address": {

          "name": "John Smith",

          "line1": "84th floor, Millennium Tower",

          "line2": "2nd main",

          "zipcode": "560000",

          "contact": "+919000090000",

          "city": "Bangalore",

          "state": "Karnataka",

          "country": "IND",

          "tag": "home",

          "landmark": "XYZ Hospital"

      },

      "billing_address": {

          "name": "John Smith",

          "line1": "84th floor, Millennium Tower",

          "line2": "2nd main",

          "zipcode": "560000",

          "contact": "+919000090000",

          "city": "Bangalore",

          "state": "Karnataka",

          "country": "IND",

          "tag": "home",

          "landmark": "XYZ Hospital"

      }

  },

  "promotions": [{\
\
      "reference_id": "reference",\
\
      "code": "code",\
\
      "type": "discount",\
\
      "value": 20,\
\
      "value_type": "flat",\
\
      "description": "description"\
\
  }],

  "device_details": {

      "ip": "127.0.0.1",

      "user_agent": "abc"

  }

}'
```

#### Request Parameters

amount

mandatory

`integer` The transaction amount expressed in the currency subunit, such as paise (in case of INR). For example, for an actual amount of ₹299.35, the value of this field should be `29935`.

currency

mandatory

`string` The currency in which the customer makes the transaction. The default is `INR`, and the length must be 3 characters.

receipt

mandatory

`string` Your receipt id for this order should be passed here. Maximum length of 40 characters.

notes

optional

`object` Key-value pair that can be used to store additional information about the entity. Maximum 15 key-value pairs, 256 characters (maximum) each. For example, `"note_key": "Beam me up Scotty”`.

rto\_review

mandatory

`boolean` Identifier to mark the order eligible for RTO risk prediction. Possible values:

- `true`: You can get RTO risk prediction using the

[orders/rto\_review](https://razorpay.com/docs/payments/magic-checkout/rto-intelligence/#step-2-view-rtorisk-reasons)
API.

- `false` (default): You can choose not to get RTO risk prediction for the order.









**Watch Out!**







If you choose not to get RTO risk prediction for the order, that is, mark the `rto_review` parameter as false, then the `line_items_total` parameter will be optional.


line\_items

optional

`array` This will have the details about the specific items added to the cart.

type

optional

`string` Defines the category type. Possible values:

- `mutual_funds`: For mutual funds.
- `e-commerce`: For all other businesses.

sku

optional

`string` Unique alphanumeric product id defined by you.

variant\_id

optional

`string` Unique alphanumeric variant id defined by you.

price

optional

`integer` Price of the product in paise.

offer\_price

optional

`integer` Price charged to the customer in paise. This is after any adjustment, such as product discount.

tax\_amount

optional

`integer` The tax levied on the product.

quantity

optional

`integer` Number of units added in the cart.

name

optional

`string` Name of the product.

description

optional

`string` Description of the product.

weight

optional

`integer` Weight of the product in grams.

dimensions

optional

`object` The dimensions of the product.

length

optional

`string` The length of the product in centimeters.

width

optional

`string` The width of the product in centimeters.

height

optional

`string` The height of the product in centimeters.

product\_url

optional

`string` URL of the product's listing page.

image\_url

optional

`string` URL of the product image.

notes

optional

`object` Key-value pair that can be used to store additional information about the entity. Maximum 15 key-value pairs, 256 characters (maximum) each. For example, `"note_key": "Beam me up Scotty”`.

line\_items\_total

mandatory

`integer` Sum of `offer_price` for all line items added in the cart in paise. For example, if a bag worth ₹8,000 and a shoe worth ₹10,000 are added to the cart, the `line_item_total` will be `180000`. This is post-tax.

shipping\_fee

optional

`integer` Shipping fee charged on the line items in paise.

cod\_fee

optional

`integer` COD fee charged on the line items in paise.

promotions

optional

`array` Used to pass all offer or discount-related information, including coupon code discount, method discount and so on.

reference\_id

mandatory

`string` Id of the Offer.

code

mandatory

`string` Coupon code used to avail discount.

type

mandatory

`string` Type of Offer. Possible values:

- `coupon`
- `offer`

value

mandatory

`decimal` The offer value that needs to be applied. In the case of `fixed_amount`, it is a flat discount. For example, ₹500. In the case of `percentage`, it is a percentage value. For example, 10%.

value\_type

mandatory

`string` The type of value. Possible values:

- `fixed_amount`: A fixed amount discount value in the currency of the order. For example, ₹500.
- `percentage`: A percentage discount value. For example, 10%.

description

optional

`string` Description of the promotion applied. For example, `New Year Sale Offer`.

customer\_details

optional

`object` Details of the customer.

name

optional

`string` Customer's name. Alphanumeric values with period (.), apostrophe (') and parentheses are allowed. The name must be between 3-50 characters in length. For example, Gaurav Kumar.

contact

optional

`string` The customer's phone number. Maximum length of 15 characters, including the country code. For example, +919000090000.

email

optional

`string` The customer's email address. Maximum length of 64 characters. For example, `gaurav.kumar@example.com`.

shipping\_address

optional

Details of the customer's shipping address.

name

optional

`string` The customer's name.

line1

optional

`string` The first line of the customer's address.

line2

optional

`string` The second line of the customer's address.

zipcode

optional

`string` The customer's ZIP code.

contact

optional

`string` The customer's email address. Maximum length of 64 characters. For example, `gaurav.kumar@example.com`.

city

optional

`string` The name of the city. For example, `Bengaluru`.

state

optional

`string` The name of the state. For example, `Karnataka`.

country

optional

`string` ISO 3 country code of the shipping address. For example, `IND`.

tag

optional

`string` Address tags are additional short descriptors commonly used for filtering and searching. Maximum length of 40 characters. For example, `Home`, `Office`, and so on.

landmark

optional

`string` Nearest landmark to the delivery address.

billing\_address

mandatory

Details of the customer's billing address.

name

mandatory

`string` The customer's name.

line1

mandatory

`string` The first line of the customer's address.

line2

mandatory

`string` The second line of the customer's address.

zipcode

mandatory

`string` The customer's ZIP code.

contact

mandatory

`string` The customer's email address. Maximum length of 64 characters. For example, `gaurav.kumar@example.com`.

city

mandatory

`string` The name of the city. For example, `Bengaluru`.

state

mandatory

`string` The name of the state. For example, `Karnataka`.

country

mandatory

`string` ISO 3 country code of the billing address. For example, `IND`.

tag

optional

`string` Address tags are additional short descriptors commonly used for filtering and searching. Maximum length of 40 characters. For example, `Home`, `Office`, and so on.

landmark

optional

`string` Nearest landmark to the delivery address.

device\_details

optional

`object` Details of the customer.

ip

optional

`string` Public IP Address of the device used to place the order.

user\_agent

optional

`string` The user-agent header of the customer's browser.

#### Response Parameters

amount

`integer` The amount for which the order was created, in currency subunits. For example, for an amount of ₹295, enter `29500`.

amount\_due

`integer` The amount pending against the order.

amount\_paid

`string` The amount paid by the customer.

attempts

`integer` The number of payment attempts, successful and failed, that have been made against this order. For example, `1`.

cod\_fee

`integer` COD fee charged on the line items in paise.

created\_at

`string` The Unix timestamp when the order was created.

currency

`string` A 3 letter ISO code for the currency you want to accept the payment. For example, INR. Refer to the list of

[supported currencies](https://razorpay.com/docs/payments/international-payments/#supported-currencies)

.

customer\_details

`object` Details of the customer.

contact

`string` The customer's phone number. Maximum length of 15 characters, including the country code. For example, +919000090000.

email

`string` The customer's email address. Maximum length of 64 characters. For example, `gaurav.kumar@example.com`.

insights

`json object` Additional customer details including past transaction data.

name

`string` Customer's name. Alphanumeric values with period (.), apostrophe (') and parentheses are allowed. The name must be between 3-50 characters in length. For example, Gaurav Kumar.

shipping\_address

Details of the customer's shipping address.

city

`string` The name of the city. For example, `Bengaluru`.

contact

`string` The customer's email address. Maximum length of 64 characters. For example, `gaurav.kumar@example.com`.

country

`string` ISO 3 country code of the shipping address. For example, `IND`.

landmark

`string` Nearest landmark to the delivery address.

latitude

`float` Latitude of the position expressed in decimal degrees (WSG 84), for example, 6.244203. A positive value denotes the northern hemisphere or the equator, and a negative value denotes the southern hemisphere. The number of digits represents the precision of the coordinate.

line1

`string` The first line of the customer's address.

line2

`string` The second line of the customer's address.

longitude

`float` Longitude of the position expressed in decimal degrees (WSG 84), for example, -75.581211. A positive value denotes east longitude or the prime meridian, and a negative value denotes west longitude. The number of digits represents the precision of the coordinate.

name

`string` The customer's name.

state

`string` The name of the state. For example, `Karnataka`.

tag

`string` Address tags are additional short descriptors commonly used for filtering and searching. Maximum length of 40 characters. For example, `Home`, `Office`, and so on.

zipcode

`string` The customer's ZIP code.

billing\_address

Details of the customer's billing address.

city

`string` The name of the city. For example, `Bengaluru`.

contact

`string` The customer's email address. Maximum length of 64 characters. For example, `gaurav.kumar@example.com`.

country

`string` ISO 3 country code of the billing address. For example, `IND`.

landmark

`string` Nearest landmark to the delivery address.

latitude

`float` Latitude of the position expressed in decimal degrees (WSG 84), for example, 6.244203. A positive value denotes the northern hemisphere or the equator, and a negative value denotes the southern hemisphere. The number of digits represents the precision of the coordinate.

line1

`string` The first line of the customer's address.

line2

`string` The second line of the customer's address.

longitude

`float` Longitude of the position expressed in decimal degrees (WSG 84), for example, -75.581211. A positive value denotes east longitude or the prime meridian, and a negative value denotes west longitude. The number of digits represents the precision of the coordinate.

name

`string` The customer's name.

state

`string` The name of the state. For example, `Karnataka`.

tag

`string` Address tags are additional short descriptors commonly used for filtering and searching. Maximum length of 40 characters. For example, `Home`, `Office`, and so on.

zipcode

`string` The customer's ZIP code.

entity

`integer` Indicates the type of entity. Here, it is `order`.

id

`string` The unique identifier of the order.

line\_items\_total

`integer` Sum of `offer_price` for all line items added in the cart in paise. For example, if a bag worth ₹8,000 and a shoe worth ₹10,000 are added to the cart, the `line_item_total` will be `180000`. This is post-tax.

notes

`object` Key-value pair that can be used to store additional information about the entity. Maximum 15 key-value pairs, 256 characters (maximum) each. For example, `"note_key": "Beam me up Scotty”`.

offers

`array` Offers enabled on your account.

promotions

`array` Used to pass all offer or discount-related information, including coupon code discount, method discount and so on.

reference\_id

`string` Id of the Offer.

code

`string` Coupon code used to avail discount.

type

`string` Type of Offer. Possible values:

- `coupon`
- `offer`

value

mandatory

`decimal` The offer value that is applied. In the case of `fixed_amount`, it is a flat discount. For example, ₹500. In the case of `percentage`, it is a percentage value. For example, 10%.

value\_type

mandatory

`string` The type of value. Possible values:

- `fixed_amount`: A fixed amount discount value in the currency of the order. For example, ₹500.
- `percentage`: A percentage discount value. For example, 10%.

description

`string` Description of the promotion applied. For example, `New Year Sale Offer`.

receipt

`string` Receipt number that corresponds to this order. The maximum length of 40 characters and has to be unique.

shipping\_fee

`integer` Shipping fee charged on the line items in paise.

status

`integer` The status of the order. Possible values:

- `created`: When you create an order, it is in the created state. It stays in this state till a payment is attempted on it.
- `attempted`: An order moves from created to attempted state when a payment is first attempted. It remains in this state till the payment associated with the order is captured.
- `paid`: After successfully capturing the payment, the order moves to the paid state. The order stays in the paid state even if the payment associated with the order is refunded.

## [Step 2: View RTO/Risk Reasons](https://razorpay.com/docs/payments/magic-checkout/rto-intelligence/\#step-2-view-rto-risk-reasons)

You can use the `order_id` obtained in the

[previous step](https://razorpay.com/docs/payments/magic-checkout/rto-intelligence/#step-1-create-an-order)

to view the RTO risk and reasons why a particular order is risky. This information can be consumed to:

- Disable COD as a payment method for a customer.
- Take necessary action on the order, like calling up the customer post-order placement to verify if they are a genuine customer.

**Watch Out!**

In the path parameter, do not include `order_`; add only the id returned. For example, if the order id is `order_EKwxwAgItXXXX`, include only `EKwxwAgItXXXX` in the path parameter.

POST

/orders/:order\_id/rto\_review

Request

Response

CurlJavaPythonGoPHPRubyNode.JS.NET

copy

```bash
curl -u [YOUR_KEY_ID]:[YOUR_KEY_SECRET] \

-X POST https://api.razorpay.com/v1/orders/EKwxwAgItXXXX/rto_review \

-H "content-type: application/json" \

-d
```

#### Path Parameter

order\_id

mandatory

`string` The unique identifier of an order to access the `rto_review` information.

#### Response Parameters

risk\_tier

`string` Determines how risky the order is. Possible values:

- `high`
- `medium`
- `low`

rto\_reasons

`array` Top 5 reasons for risky orders in descending order of importance.

[Refer to the list of possible reasons](https://razorpay.com/docs/payments/magic-checkout/rto-intelligence/appendix/)

for risky orders.

reason

`string` Id of the Offer.

description

`string` A unique identifier for the RTO reason.

bucket

`string` Categorises the reason into a specific group. For example, both reasons in the code are categorised under the address bucket.

#### Error Response Parameters

Given below is the list of errors for RTO review.

#### INVALID\_ARGUMENT

- **Error**: input\_validation\_failed
- **Description**: The id provided does not exist.
- **Error Status**: 400
- **Source**: business
- **Step**: rto\_review
- **Next Steps**: Try with the id shared back during order creation response (/v1/orders)

#### INVALID\_ARGUMENT

- **Error**: input\_validation\_failed
- **Description**: order\_id: the length must be exactly 14
- **Error Status**: 400
- **Source**: business
- **Step**: rto\_review
- **Next Steps**: Invalid order\_id cannot be mapped back to an existing order. Try with the id shared back during order creation response (v1/orders)

#### INVALID\_ARGUMENT

- **Error**: input\_validation\_failed
- **Description**: Mandatory field shipping\_address not present
- **Error Status**: 400
- **Source**: business
- **Step**: rto\_review
- **Next Steps**: Shipping address was not shared in order\_create API (/v1/orders). Please try creating an order again with all the mandatory details.

#### INTERNAL

- **Error**: NA
- **Description**: We are facing some trouble completing your request at the moment. Please try again shortly.
- **Error Status**: 500
- **Source**: business
- **Step**: rto\_review
- **Next Steps**: Please try in a while.

### [Step 3: Update the Fulfillment Details](https://razorpay.com/docs/payments/magic-checkout/rto-intelligence/\#step-3-update-the-fulfillment-details)

Use the code below to update the Fulfilment details of the order and payment method used.

**Watch Out!**

You must update the payment method details if you are not a

[Razorpay Payment Gateway](https://razorpay.com/docs/payments/payment-gateway/)

user.

POST

/orders/:order\_id/fulfillment

Request Parameters

Response Parameters

CurlJavaPythonGoPHPRubyNode.JS.NET

copy

```bash
curl -u [YOUR_KEY_ID]:[YOUR_KEY_SECRET] \

-X POST https://api.razorpay.com/v1/orders/EKwxwAgItXXXX/fulfillment \

-H "content-type: application/json" \

-d '{

  "payment_method": "upi",

  "shipping": {

    "waybill": "123456789",

    "status": "rto",

    "provider": "Bluedart"

  }

}'
```

#### Path Parameter

order\_id

mandatory

`string` The unique identifier of an order to access the fulfillment information.

#### Request Parameters

payment\_method

optional

`string` Payment Method opted by the customer to complete the payment. Possible values:

- `upi`
- `card`
- `wallet`
- `netbanking`
- `cod`
- `emi`
- `cardless_emi`
- `paylater`
- `recurring`
- `other`

**Watch Out!**

This is a mandatory field if the payment object is present in the API.

shipping

optional

`object` Contains the shipping data.

waybill

mandatory

`string` AWB number of the order. It is null if `enable_tracking` is set to false.

status

`string` Fulfillment status of the shipment. Possible values:

- `rto`: Order returned to the origin or in the process of returning to origin.
- `delivered`: Order delivered successfully.
- `cancelled`: Order canceled before or after shipping.
- `lost`: Order lost during or before transit.
- `returned`: Order returned by the customer post delivery.
- `partially_delivered`: Delivered a part of the multi-package product.
- `created`: Order in transit or yet to be shipped.

provider

`string` Name of the shipping provider used for shipment.

#### Error Response Parameters

Given below is the the list of errors for fulfillment details.

#### INVALID\_ARGUMENT

- **Error**: input\_validation\_failed
- **Description**: The id provided does not exist.
- **Error Status**: 400
- **Source**: business
- **Step**: fulfillment\_updates
- **Next Steps**: Try with another id shared as a response to (/v1/orders)

#### INVALID\_ARGUMENT

- **Error**: input\_validation\_failed
- **Description**: Mandatory fields are missing in payment object: \["order\_id"\]
- **Error Status**: 400
- **Source**: business
- **Step**: fulfillment\_updates
- **Next Steps**: Please send order\_id in the URL to get RTO reviews for that order.

#### INVALID\_ARGUMENT

- **Error**: input\_validation\_failed
- **Description**: shipping\_status: invalid shipping status entered, please pass a valid shipping status.
- **Error Status**: 400
- **Source**: business
- **Step**: fulfillment\_updates
- **Next Steps**: Please pass a valid shipping status.

#### INTERNAL

- **Error**: NA
- **Description**: We are facing some trouble completing your request at the moment. Please try again shortly.
- **Error Status**: 500
- **Source**: business
- **Step**: NA
- **Next Steps**: Please try in a while.

* * *

Was this page helpful?

Yes

No

ON THIS PAGE

- [Use Cases](https://razorpay.com/docs/payments/magic-checkout/rto-intelligence/#use-cases)

- [Prerequisites](https://razorpay.com/docs/payments/magic-checkout/rto-intelligence/#prerequisites)

- [Integration Steps](https://razorpay.com/docs/payments/magic-checkout/rto-intelligence/#integration-steps)

- [Step 1: Create an Order](https://razorpay.com/docs/payments/magic-checkout/rto-intelligence/#step-1-create-an-order)

- [Step 2: View RTO/Risk Reasons](https://razorpay.com/docs/payments/magic-checkout/rto-intelligence/#step-2-view-rto-risk-reasons)

- [Step 3: Update the Fulfillment Details](https://razorpay.com/docs/payments/magic-checkout/rto-intelligence/#step-3-update-the-fulfillment-details)


Back To Top