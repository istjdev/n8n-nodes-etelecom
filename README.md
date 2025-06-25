# n8n-nodes-etelecom

![eTelecom Zalo OA Banner](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

This integration package provides nodes to connect [eTelecom Zalo OA](https://etelecom.vn) services with [n8n](https://n8n.io), allowing you to send and receive Zalo OA messages through eTelecom in your n8n workflows.

## Features

This package currently provides the following nodes:

- **eTelecom Zalo OA Send Message**: Send text messages from a Zalo OA account to Zalo users
- **eTelecom Zalo OA Trigger**: Trigger workflows when receiving webhook events from Zalo OA (e.g., incoming messages, messaging status)
- **eTelecom Zalo OA Request User Info**: Request user information from a Zalo OA account
- **eTelecom Zalo OA Send ZNS**: Send ZNS messages from a Zalo OA account to Zalo users
- **eTelecom Zalo OA Request Consent**: Request consent permissions from Zalo users

## Installation

Follow these instructions to install this node package in your n8n instance:

### In n8n Desktop or via npm

```bash
# Install via npm
npm install n8n-nodes-etelecom

# Or with pnpm
pnpm install n8n-nodes-etelecom
```

### For self-hosted n8n users

1. Open your n8n installation directory
2. Install the package: `npm install n8n-nodes-etelecom`
3. Restart n8n

### Using Docker

If you're running n8n with Docker, you can install custom nodes using an environment variable:

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e N8N_CUSTOM_EXTENSIONS="n8n-nodes-etelecom" \
  n8nio/n8n
```

## Usage

After installation, the eTelecom Zalo OA nodes will be available in the n8n workflow editor under the "eTelecom" category.

### Configuration Requirements

1. You need an eTelecom account with API access
2. Add eTelecom API credentials to n8n:
   - API Domain (typically the eTelecom server address)
   - Your API Token

### eTelecom Zalo OA Send Message

This node allows you to send text messages from your Zalo OA account to Zalo users. Parameters include:

- **Zalo Official Account**: Select the Zalo OA account you want to send messages from
- **User ID**: The ID of the Zalo user you want to send the message to
- **Message**: Text message content

### eTelecom Zalo OA Trigger

This node creates a webhook endpoint and triggers your workflow when Zalo OA events are received through eTelecom. To use:

1. Add the eTelecom Zalo OA Trigger node to your workflow
2. Select the Zalo OA account to receive events from
3. Activate the workflow
4. The node will automatically register the webhook URL with eTelecom for the selected Zalo OA account
5. Your workflow will now be triggered whenever there's an event from the selected OA account

### eTelecom Zalo OA Request User Info

This node allows you to request user information from your Zalo OA account. Parameters include:

- **Zalo Official Account**: Select the Zalo OA account you want to request information from
- **Zalo User ID**: The ID of the Zalo user you want to request information for

### eTelecom Zalo OA Request Consent

This node allows you to request consent permissions from Zalo users for your Zalo OA account. Parameters include:

- **Zalo Official Account**: Select the Zalo OA account you want to request consent for
- **Zalo User ID**: The ID of the Zalo user you want to request permissions from
- **Scopes**: The permission scopes you want to request from the user

## Development

### Requirements

To develop this project, you need:

- [git](https://git-scm.com/downloads)
- Node.js and pnpm (Node minimum version 18)
- n8n installation: `pnpm install n8n -g`

### Local Development

1. Clone the repo: `git clone https://github.com/isfjdev/n8n-nodes-etelecom.git`
2. Install dependencies: `pnpm install`
3. Compile TypeScript code: `pnpm build`
4. Link the package to local n8n: `pnpm link`
5. Start n8n in development mode: `n8n start -d ./`

## License

[MIT](LICENSE.md)
