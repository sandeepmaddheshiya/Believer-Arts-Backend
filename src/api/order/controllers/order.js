("use strict");
const stripe = require("stripe")(process.env.STRIPE_KEY);
/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { products } = ctx.request.body;
    try {
      const lineItems = await Promise.all(
        products.map(async (product) => {
          const item = await strapi
            .service("api::product.product")
            .findOne(product.id);

          return {
            price_data: {
              currency: "cad",
              product_data: {
                name: item.title,
                description:item.desc,
                images:[item.image],
              },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: product.attributes.quantity,
          };
        })
      );

      // const session = await stripe.checkout.sessions.create({
      //   shipping_address_collection: { allowed_countries: ["CA"] },
      //   payment_method_types: ["card"],
      //   mode: "payment",
      //   success_url: process.env.CLIENT_URL + "/success",
      //   cancel_url: process.env.CLIENT_URL + "?success=false",
      //   line_items: lineItems,
       
      // });

      const session = await stripe.checkout.sessions.create({
        billing_address_collection: 'required', 
        shipping_address_collection: {
          allowed_countries: [] // Allow shipping addresses from all countries
        },
        payment_method_types: ["card"],
        mode: "payment",
        success_url: process.env.CLIENT_URL + "/success",
        cancel_url: process.env.CLIENT_URL + "/failed",
        line_items: lineItems,
        currency: "cad", 
        
        phone_number_collection: { 
          enabled: true
        }
      });
      
      

      await strapi
        .service("api::order.order")
        .create({ data: { products, stripeId: session.id } });

      return { stripeSession: session };
    } catch (error) {
      ctx.response.status = 500;
      return { error };
    }
  },
}));