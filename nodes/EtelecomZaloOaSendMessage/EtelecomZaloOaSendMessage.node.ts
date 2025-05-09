import {
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IRequestOptions,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

export class EtelecomZaloOaSendMessage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Etelecom Zalo Oa Send Message',
		name: 'etelecomZaloOaSendMessage',
		icon: 'file:etelecom.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Send messages via Etelecom Zalo Oa',
		defaults: {
			name: 'Etelecom Zalo Oa Send Message',
		},
		// @ts-ignore
		inputs: ['main'],
		// @ts-ignore
		outputs: ['main'],
		credentials: [
			{
				name: 'eTelecomApi',
				required: true,
				displayName: 'Credential to connect with',
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'hidden',
				default: 'message',
				description: 'Resource for this node',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'hidden',
				default: 'sendText',
				description: 'Send text message operation',
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
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				default: '',
				required: true,
				description: 'The ID of the user to send the message to',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				default: '',
				required: true,
				description: 'Text message to send to the user',
				typeOptions: {
					rows: 4,
				},
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

				try {
					this.logger.debug('Making Zalo Oa list request with options:', {
						url: options.url,
					});

					let response = await this.helpers.request(options);

					if (typeof response === 'string') {
						try {
							response = JSON.parse(response);
						} catch (parseError) {
							this.logger.error('Failed to parse response as JSON:', { parseError });
							throw new NodeApiError(this.getNode(), parseError, {
								message: `Failed to parse API response: ${parseError.message}`,
							});
						}
					}

					if (!response || !response.accounts || !Array.isArray(response.accounts)) {
						throw new NodeApiError(this.getNode(), response, {
							message: 'Invalid response from ETelecom API',
						});
					}

					const returnData: INodePropertyOptions[] = response.accounts.map(
						(account: { name: string; oa_id: string }) => ({
							name: account.name,
							value: account.oa_id,
							description: `Oa ID: ${account.oa_id}`,
						}),
					);

					return returnData;
				} catch (error) {
					this.logger.error('Error fetching Zalo Oas:', {
						error,
						message: error.message,
					});
					throw new NodeApiError(this.getNode(), error);
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const oaId = this.getNodeParameter('oaId', i) as string;
				const userId = this.getNodeParameter('userId', i) as string;
				const messageText = this.getNodeParameter('message', i) as string;

				const credentials = await this.getCredentials('eTelecomApi');

				if (!credentials) {
					throw new NodeOperationError(this.getNode(), 'No credentials provided');
				}

				// Make API call to send the message using the new endpoint and payload structure
				const options: IRequestOptions = {
					method: 'POST' as IHttpRequestMethods,
					url: `${credentials.domain}/shop.Zalo/OASendText`,
					body: {
						message: {
							text: messageText,
						},
						oa_id: oaId,
						recipient: {
							user_id: userId,
						},
					},
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${credentials.token}`,
					},
					json: true,
				};

				this.logger.debug('Sending message to Zalo user:', {
					oaId,
					userId,
					messageLength: messageText.length,
				});

				const response = await this.helpers.request(options);

				this.logger.debug('Send message response:', { response });

				returnData.push({
					json: {
						success: true,
						oa_id: oaId,
						user_id: userId,
						response,
					},
					pairedItem: {
						item: i,
					},
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							success: false,
							error: error.message,
						},
						pairedItem: {
							item: i,
						},
					});
				} else {
					throw new NodeApiError(this.getNode(), error);
				}
			}
		}

		return [returnData];
	}
}
