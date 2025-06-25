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

export class EtelecomZaloOaSendZns implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Etelecom Zalo Oa Send ZNS',
		name: 'etelecomZaloOaSendZns',
		icon: 'file:etelecom.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Send ZNS via Etelecom Zalo OA',
		defaults: {
			name: 'Etelecom Zalo Oa Send ZNS',
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
				default: 'zns',
				description: 'Resource for this node',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'hidden',
				default: 'send',
				description: 'Send ZNS',
			},
			{
				displayName: 'Development Mode',
				name: 'development',
				type: 'boolean',
				default: false,
				description: 'Whether to send in development mode',
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
				description: 'Recipient phone number',
			},
			{
				displayName: 'Template Name or ID',
				name: 'templateId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTemplates',
				},
				default: '',
				required: true,
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Tracking ID',
				name: 'trackingId',
				type: 'string',
				default: '',
				description: 'Tracking identifier',
			},
			{
				displayName: 'Template Data (JSON)',
				name: 'templateData',
				type: 'string',
				default: '',
				description: 'Data for the template in JSON format',
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
					let response = await this.helpers.request(options);

					if (typeof response === 'string') {
						try {
							response = JSON.parse(response);
						} catch (parseError) {
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

					return response.accounts.map((account: { name: string; oa_id: string }) => ({
						name: account.name,
						value: account.oa_id,
						description: `Oa ID: ${account.oa_id}`,
					}));
				} catch (error) {
					throw new NodeApiError(this.getNode(), error);
				}
			},
			async getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const credentials = await this.getCredentials('eTelecomApi');

				if (!credentials) {
					throw new NodeOperationError(this.getNode(), 'No credentials provided');
				}

				const options: IRequestOptions = {
					method: 'POST' as IHttpRequestMethods,
					url: `${credentials.domain}/shop.Zalo/ListTemplates`,
					body: {},
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${credentials.token}`,
					},
					json: true,
				};

				try {
					let response = await this.helpers.request(options);

					if (typeof response === 'string') {
						try {
							response = JSON.parse(response);
						} catch (parseError) {
							throw new NodeApiError(this.getNode(), parseError, {
								message: `Failed to parse API response: ${parseError.message}`,
							});
						}
					}

					if (!response || !response.templates || !Array.isArray(response.templates)) {
						throw new NodeApiError(this.getNode(), response, {
							message: 'Invalid response from ETelecom API',
						});
					}

					return response.templates.map((tpl: { name: string; template_id: number }) => ({
						name: tpl.name,
						value: tpl.template_id,
						description: `Template ID: ${tpl.template_id}`,
					}));
				} catch (error) {
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
				const templateId = this.getNodeParameter('templateId', i) as number;
				const trackingId = this.getNodeParameter('trackingId', i, '') as string;
				const templateDataStr = this.getNodeParameter('templateData', i, '') as string;
				const development = this.getNodeParameter('development', i) as boolean;

				const credentials = await this.getCredentials('eTelecomApi');

				if (!credentials) {
					throw new NodeOperationError(this.getNode(), 'No credentials provided');
				}

				const body: Record<string, any> = {
					oa_id: oaId,
					phone,
					template_id: templateId,
				};

				if (trackingId) {
					body.tracking_id = trackingId;
				}

				if (templateDataStr) {
					try {
						body.template_data = JSON.parse(templateDataStr);
					} catch (error) {
						throw new NodeOperationError(this.getNode(), 'Invalid JSON in Template Data');
					}
				}

				if (development) {
					body.mode = 'development';
				}

				const options: IRequestOptions = {
					method: 'POST' as IHttpRequestMethods,
					url: `${credentials.domain}/shop.Zalo/SendZNS`,
					body,
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${credentials.token}`,
					},
					json: true,
				};

				const response = await this.helpers.request(options);

				returnData.push({
					json: {
						success: true,
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
							error: (error as Error).message,
						},
						pairedItem: { item: i },
					});
				} else {
					throw new NodeApiError(this.getNode(), error);
				}
			}
		}

		return [returnData];
	}
}
