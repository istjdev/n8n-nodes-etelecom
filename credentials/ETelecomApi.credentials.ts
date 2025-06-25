import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class eTelecomApi implements ICredentialType {
	name = 'eTelecomApi';
	displayName = 'eTelecom API';
	documentationUrl = 'https://etelecom.vn/docs';
	properties: INodeProperties[] = [
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			default: '',
			typeOptions: {
				password: true,
			},
			required: true,
		},
		{
			displayName: 'Base URL',
			name: 'domain',
			type: 'string',
			default: 'https://api.etelecom.vn/v1',
			required: true,
		},
	];

	// This allows the credential to be used by other parts of n8n
	// stating how this credential is injected as part of the request
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '={{"Bearer " + $credentials.token}}',
			},
		},
	};

	// The block below tells how this credential can be tested when the Save button is clicked
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.domain}}',
			url: '/shop.Misc/CurrentAccount',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: '={{`Bearer ${$credentials.token}`}}',
			},
			body: JSON.stringify({}), // This will be stringified to "{}" in the actual request
		},
	};
}

// For backward compatibility
export const ETelecomApi = eTelecomApi;
