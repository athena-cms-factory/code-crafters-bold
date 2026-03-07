# Automated Showcase Generator

The `automatic-showcase-generator.js` is a powerful tool within the Athena CMS Factory that autonomously generates complete demonstration websites.

## Functionalities
*   **Fully Autonomous:** Conceives company names, concepts, data structures, design systems, and content.
*   **Resume-Aware:** Automatically skips sites that have already been generated.
*   **RAM-Safe:** Performs installations and builds sequentially with limited concurrency.
*   **Quota-Smart:** Includes retry logic and supports lighter AI models.

## Usage

### Standard Run (Flash Model)
```bash
export ATHENA_ROOT=$(pwd)
node automatic-showcase-generator.js
```

### Lite Run (In case of Quota Issues)
If you encounter `429 Too Many Requests` errors, switch to the Lite model in the script:

1.  Open `automatic-showcase-generator.js`
2.  Find the line `const model = ...`
3.  Change it to:
    ```javascript
    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
    ```
4.  Restart the script.

## Current Showcase Portfolio
The tool and manual orchestration have generated a unified ecosystem including:
- **Athena Hub**: Central entry point and gallery.
- **Urban Soles**: High-end E-commerce sneaker shop. (v2.0 Content)
- **Praktijk De Groeikern**: Professional service provider for therapeuts.
- **Bakkerij Artisanaal**: Local artisanal food shop with ordering system.
- **Karel Full Stack**: Technical portfolio and creative showcase.
- **Legacy Demos**: Cheese Making, Architecture, Yoga Studio, etc.


## Troubleshooting
- **503 Service Unavailable:** The script automatically waits and retries (exponential backoff).
- **Quota Exceeded:** Stop the script and wait for your quota to reset (usually after 1 hour or the next day), or switch to the Lite model.