/**
 * PaymentController.js
 * @description Manages payment gateway integrations (Stripe, PayPal, Mollie).
 */

import fs from 'fs';
import path from 'path';
import Stripe from 'stripe';

export class PaymentController {
    constructor(configManager) {
        this.configManager = configManager;
        this.root = configManager.root;
    }

    /**
     * Create a Stripe Checkout Session for a project
     */
    async createStripeSession(projectName, cart, successUrl, cancelUrl) {
        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
            throw new Error("STRIPE_SECRET_KEY niet geconfigureerd in .env");
        }

        const stripe = new Stripe(stripeKey);

        const lineItems = cart.map(item => ({
            price_data: {
                currency: 'eur',
                product_data: {
                    name: item.title || item.name || 'Product',
                    description: item.korte_beschrijving || '',
                    images: item.product_foto_url ? [item.product_foto_url] : [],
                },
                unit_amount: Math.round(parseFloat(item.price) * 100), // Stripe expects cents
            },
            quantity: item.quantity || 1,
        }));

        const session = await stripe.checkout.sessions.create({
            line_items: lineItems,
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                project_name: projectName
            }
        });

        return {
            id: session.id,
            url: session.url
        };
    }

    /**
     * Get payment settings for a specific site
     */
    getProjectPaymentConfig(projectName) {
        const configPath = path.join(this.root, 'sites', projectName, 'src/data/shop_settings.json');
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        return {
            gateway: 'stripe',
            currency: 'EUR',
            test_mode: true
        };
    }
}
