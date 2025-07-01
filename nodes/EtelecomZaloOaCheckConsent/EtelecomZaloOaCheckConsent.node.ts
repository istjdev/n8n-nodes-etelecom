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

export class eTelecomZaloOaCheckConsent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'eTelecom Zalo Oa Check Consent',
		name: 'etelecomZaloOaCheckConsent',
		icon: 'file:etelecom.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Check consent status via eTelecom Zalo Oa',
		defaults: {
			name: 'eTelecom Zalo Oa Check Consent',
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
				default: 'consent',
				description: 'Resource for this node',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'hidden',
				default: 'checkConsent',
				description: 'Check consent operation',
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
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				required: true,
				description: 'The phone number to check consent status for',
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
				const phone = this.getNodeParameter('phone', i) as string;

				const credentials = await this.getCredentials('eTelecomApi');

				if (!credentials) {
					throw new NodeOperationError(this.getNode(), 'No credentials provided');
				}

				// Make API call to check consent status
				const options: IRequestOptions = {
					method: 'POST' as IHttpRequestMethods,
					url: `${credentials.domain}/shop.Zalo/CheckConsent`,
					body: {
						oa_id: oaId,
						phone: phone,
					},
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${credentials.token}`,
					},
					json: true,
				};

				this.logger.debug('Checking consent status from Zalo:', {
					oaId,
					phone,
				});

				const response = await this.helpers.request(options);

				this.logger.debug('Check consent response:', { response });

				returnData.push({
					json: {
						success: true,
						oa_id: oaId,
						phone: phone,
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
					throw error;
				}
			}
		}

		return [returnData];
	}
}

// For backward compatibility
export const EtelecomZaloOaCheckConsent = eTelecomZaloOaCheckConsent;
