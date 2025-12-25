// src/utils/encrypt.js
import JSEncrypt from 'jsencrypt';

const publicKey = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAylaDj9dJc1VE9rvEOj4U
L4WTZZc9MP/vUAxbiEzzD27GT0az9Hw5sfsZ68f5jqFKlgZPWp30iBFrTMFwYQBF
SDLV51nztwImRiI7E3Kpwx/MdCpIIyvCMPhHKdmzk2+pesK0cpg2eW2NGIjVwop9
pAcDkRPAQg2eC573V1x8dFCIDja9lfRwX9a+Lmgs0issd10rqK3JL+vaPUSZn0a6
WTsZEosIFehMbW3vc5UYz0dZMpRLNY7y8saWZJlv0kYkeK5Tl4bwrnocT5ndB0/n
mr8CM1mL7a2RgCggxKtSV5nnBaCIYL5PZTC4QWs9CNSJ22MMRdWVhLGszGfJgSTQ
xwIDAQAB
-----END PUBLIC KEY-----
`;

export const encryptData = (data) => {
    const encryptor = new JSEncrypt();
    encryptor.setPublicKey(publicKey);

    return encryptor.encrypt(data);
};