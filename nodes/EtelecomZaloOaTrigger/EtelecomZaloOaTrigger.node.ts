import {
	IHookFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IRequestOptions,
	IWebhookFunctions,
	IWebhookResponseData,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

export class eTelecomZaloOaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'eTelecom Zalo Oa Trigger',
		name: 'etelecomZaloOaTrigger',
		icon: 'file:etelecom.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["oaId"]}}',
		description: 'Handle Zalo Oa webhook events',
		defaults: {
			name: 'eTelecom Zalo Oa Trigger',
		},
		// @ts-ignore
		inputs: [],
		// @ts-ignore
		outputs: ['main'],
		credentials: [
			{
				name: 'eTelecomApi',
				required: true,
				displayName: 'Credential to connect with',
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'hidden',
				default: 'trigger',
				description: 'Resource for this node',
			},
			{
				displayName: 'Webhook URLs',
				name: 'webhookUrls',
				type: 'hidden',
				default: '',
			},
			{
				displayName: 'Zalo Official Account Name or ID',
				name: 'oaId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getZaloOAs',
				},
				default: '',
				required: true,
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
		],
	};

	methods = {
		loadOptions: {
			async getZaloOAs(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('eTelecomApi');

				if (!credentials) {
					throw new NodeOperationError(this.getNode(), 'No credentials provided');
				}

				// Make API call to get the OA list
				const options: IRequestOptions = {
					method: 'POST' as IHttpRequestMethods,
					url: `${credentials.domain}/shop.Zalo/ListOA`,
					body: {},
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${credentials.token}`,
					},
					json: true, // Set to true to automatically parse JSON response
				};

				try {
					this.logger.debug('Making Zalo Oa list request with options:', {
						url: options.url,
					});

					// Make the API request
					let response = await this.helpers.request(options);

					// Log the raw response for debugging
					this.logger.debug('Received raw Zalo Oa list response:', { response });

					// Check if the response is a string (needs parsing)
					if (typeof response === 'string') {
						this.logger.debug('Response is a string, attempting to parse as JSON');
						try {
							response = JSON.parse(response);
						} catch (parseError) {
							this.logger.error('Failed to parse response as JSON:', { parseError });
							throw new NodeApiError(this.getNode(), parseError, {
								message: `Failed to parse API response: ${parseError.message}`,
							});
						}
					}

					this.logger.debug('Processed response:', { response });

					// Verify the response has the expected structure
					if (!response || !response.accounts || !Array.isArray(response.accounts)) {
						this.logger.error('Unexpected API response structure:', { response });
						throw new NodeApiError(this.getNode(), response, {
							message: 'Invalid response from ETelecom API',
						});
					}

					// Transform the response into options for the dropdown
					const returnData: INodePropertyOptions[] = response.accounts.map(
						(account: { name: string; oa_id: string }) => ({
							name: account.name,
							value: account.oa_id,
							description: `Oa ID: ${account.oa_id}`,
						}),
					);

					this.logger.debug('Transformed Oa options:', { options: returnData });
					return returnData;
				} catch (error) {
					this.logger.error('Error fetching Zalo Oas:', {
						error,
						message: error.message,
						url: options.url,
						credentials: {
							domain: credentials.domain,
							hasToken: !!credentials.token,
						},
					});
					throw new NodeApiError(this.getNode(), error);
				}
			},
		},
	};

	// @ts-ignore
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const oaId = this.getNodeParameter('oaId') as string;

				// Get credentials for API call
				const credentials = await this.getCredentials('eTelecomApi');

				if (!credentials) {
					throw new NodeOperationError(this.getNode(), 'No credentials provided');
				}

				try {
					// Make API call to get the current OA details
					const options: IRequestOptions = {
						method: 'POST' as IHttpRequestMethods,
						url: `${credentials.domain}/shop.Zalo/ListOA`,
						body: {},
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${credentials.token}`,
						},
						json: true,
					};

					let response = await this.helpers.request(options);

					// Parse response if it's a string
					if (typeof response === 'string') {
						try {
							response = JSON.parse(response);
						} catch (parseError) {
							this.logger.error('Failed to parse response as JSON:', { parseError });
							return false;
						}
					}

					// Check if the current OA has the same webhook URL
					if (response && response.accounts && Array.isArray(response.accounts)) {
						const currentOA = response.accounts.find(
							(account: { oa_id: string }) => account.oa_id === oaId,
						);

						if (currentOA && currentOA.webhook_url === webhookUrl) {
							this.logger.info('Webhook already registered for this Oa:', {
								oaId,
								webhookUrl,
							});
							return true;
						}
					}

					return false;
				} catch (error) {
					this.logger.error('Error checking if webhook exists:', { error });
					return false;
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const oaId = this.getNodeParameter('oaId') as string;

				// Get credentials for API call
				const credentials = await this.getCredentials('eTelecomApi');

				if (!credentials) {
					throw new NodeOperationError(this.getNode(), 'No credentials provided');
				}

				try {
					// Make API call to register the webhook
					const options: IRequestOptions = {
						method: 'POST' as IHttpRequestMethods,
						url: `${credentials.domain}/shop.Zalo/UpdateShopOA`,
						body: {
							oa_id: oaId,
							webhook_url: webhookUrl,
						},
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${credentials.token}`,
						},
						json: true,
					};

					this.logger.debug('Registering webhook with ETelecom:', {
						oaId,
						webhookUrl,
					});

					const response = await this.helpers.request(options);

					this.logger.debug('Webhook registration response:', { response });

					if (response && response.oa_id) {
						this.logger.info(
							`Webhook successfully registered for OA ID: ${oaId}, URL: ${webhookUrl}`,
						);
						return true;
					} else {
						this.logger.error('Failed to register webhook:', { response });
						throw new NodeApiError(this.getNode(), response, {
							message: 'Failed to register webhook with ETelecom API',
						});
					}
				} catch (error) {
					this.logger.error('Error registering webhook:', { error });
					throw new NodeApiError(this.getNode(), error);
				}
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const oaId = this.getNodeParameter('oaId') as string;

				// Get credentials for API call
				const credentials = await this.getCredentials('eTelecomApi');

				if (!credentials) {
					throw new NodeOperationError(this.getNode(), 'No credentials provided');
				}

				try {
					// Make API call to unregister the webhook by setting it to an empty string
					const options: IRequestOptions = {
						method: 'POST' as IHttpRequestMethods,
						url: `${credentials.domain}/shop.Zalo/UpdateShopOA`,
						body: {
							oa_id: oaId,
							webhook_url: '', // Empty string to remove the webhook
						},
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${credentials.token}`,
						},
						json: true,
					};

					this.logger.debug('Unregistering webhook with ETelecom:', { oaId });

					const response = await this.helpers.request(options);

					this.logger.debug('Webhook unregistration response:', { response });

					if (response) {
						this.logger.info(`Webhook successfully unregistered for Oa ID: ${oaId}`);
						return true;
					} else {
						this.logger.error('Failed to unregister webhook:', { response });
						throw new NodeApiError(this.getNode(), response, {
							message: 'Failed to unregister webhook with ETelecom API',
						});
					}
				} catch (error) {
					this.logger.error('Error unregistering webhook:', { error });
					throw new NodeApiError(this.getNode(), error);
				}
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();
		const eventType = (bodyData.event_name as string) || '';
		const headerData = this.getHeaderData();
		const oaId = this.getNodeParameter('oaId') as string;

		// Using ETelecomApi credentials for any API interactions needed
		// const credentials = await this.getCredentials('eTelecomApi');

		// Return the webhook data to be processed
		return {
			workflowData: [
				this.helpers.returnJsonArray({
					headers: headerData,
					body: bodyData,
					event: eventType,
					oaId,
					timestamp: new Date().toISOString(),
				}),
			],
		};
	}
}

// For backward compatibility
export const EtelecomZaloOaTrigger = eTelecomZaloOaTrigger;
