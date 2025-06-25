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

export class eTelecomZaloOaRequestConsent implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'eTelecom Zalo Oa Request Consent',
		name: 'etelecomZaloOaRequestConsent',
		icon: 'file:etelecom.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Request consent via eTelecom Zalo Oa',
		defaults: {
			name: 'eTelecom Zalo Oa Request Consent',
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
				default: 'requestConsent',
				description: 'Request consent operation',
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
				description: 'The phone number to request consent from',
			},
			{
				displayName: 'Call Type',
				name: 'callType',
				type: 'options',
				options: [
					{
						name: 'Audio',
						value: 'audio',
					},
					{
						name: 'Video',
						value: 'video',
					},
					{
						name: 'Audio and Video',
						value: 'audio_and_video',
					},
				],
				default: 'audio',
				required: true,
				description: 'The type of call for the consent request',
			},
			{
				displayName: 'Reason Code',
				name: 'reasonCode',
				type: 'options',
				options: [
					{
						name: 'Delivery Notification',
						value: 'delivery_notification',
					},
					{
						name: 'Flight Announcement',
						value: 'flight_announcement',
					},
					{
						name: 'Order/Appointment Confirmation',
						value: 'order_appointment_confirmation',
					},
					{
						name: 'Product/Service Consulting',
						value: 'product_service_consulting',
					},
					{
						name: 'Update Order',
						value: 'update_order',
					},
				],
				default: 'product_service_consulting',
				required: true,
				description: 'The reason code for the consent request',
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
				const callType = this.getNodeParameter('callType', i) as string;
				const reasonCode = this.getNodeParameter('reasonCode', i) as string;

				const credentials = await this.getCredentials('eTelecomApi');

				if (!credentials) {
					throw new NodeOperationError(this.getNode(), 'No credentials provided');
				}

				// Make API call to request consent
				const options: IRequestOptions = {
					method: 'POST' as IHttpRequestMethods,
					url: `${credentials.domain}/shop.Zalo/RequestConsent`,
					body: {
						oa_id: oaId,
						phone: phone,
						call_type: callType,
						reason_code: reasonCode,
					},
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${credentials.token}`,
					},
					json: true,
				};

				this.logger.debug('Requesting consent from Zalo:', {
					oaId,
					phone,
					callType,
					reasonCode,
				});

				const response = await this.helpers.request(options);

				this.logger.debug('Request consent response:', { response });

				returnData.push({
					json: {
						success: true,
						oa_id: oaId,
						phone: phone,
						call_type: callType,
						reason_code: reasonCode,
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
export const EtelecomZaloOaRequestConsent = eTelecomZaloOaRequestConsent;
