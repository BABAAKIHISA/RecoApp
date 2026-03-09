import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
    name: 'audioRecorderStorage',
    access: (allow) => ({
        'public/*': [
            allow.authenticated.to(['read', 'write', 'delete']),
            allow.guest.to(['read'])
        ]
    })
});
