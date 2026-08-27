# Notes

## Cloudflare

* [Cloudflare: Runtime APIs](https://developers.cloudflare.com/workers/runtime-apis/)
* [Cloudflare: How do you set different environment variables for preview URLs?](https://community.cloudflare.com/t/how-do-you-set-different-environment-variables-for-preview-urls/802898/5)
* [itty-router](https://itty.dev/)


## Authentication

### Cookies and JWT

* [Reddit: JWT + CSRF: A Good Security Practice?](https://www.reddit.com/r/node/comments/1im7yj0/jwt_csrf_a_good_security_practice/)
* [Reddit: Why are we using token-based authentication over cookies?](https://www.reddit.com/r/webdev/comments/15fgwq5/why_are_we_using_tokenbased_authentication_over/)
* [Reddit: I've generated JWT and placed it in a cookie to send it to the server](https://www.reddit.com/r/node/comments/17conpk/ive_generated_jwt_and_placed_it_in_a_cookie_to/)
* [Portswigger: Bypassing SameSite Restrictions](https://portswigger.net/web-security/csrf/bypassing-samesite-restrictions)
* [StackOverflow: Set cookies for cross-origin requests](https://stackoverflow.com/questions/46288437/set-cookies-for-cross-origin-requests#46412839)

### Access Control in EDS

* [aem.live: Cloudflare Zero Trust Setup](https://www.aem.live/developer/cloudflare-zero-trust)
* [aem.live: Integrations - Auth](https://www.aem.live/developer/integrations#authentication-and-authorization-examples)
* [Adapt.to 2024: Implementing Gated Access for AEM EDS](https://www.hitthecode.com/gated-access-aem-eds)
  * [Slides](https://adapt.to/2024/presentations/adaptto-2024-implementing-access-control-on-aem-eds-sites.pdf)

### Microsoft Entra Auth

ID Token:
* [Microsoft: OpenID Connect Protocol](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc)
* [Microsoft: ID Token Claims Reference](https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference)

Authorization Code Flow:
* [Microsoft: OAuth 2.0 authorization code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
* [MSAL Node Sample: Auth Code](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/samples/msal-node-samples/auth-code)
* [Reddit: How to use Microsoft as an external login?](https://www.reddit.com/r/dotnet/comments/ltpkp0/how_to_use_microsoft_as_an_external_login/)
* [Blog: How to implement OIDC with Microsoft Entra ID](https://supertokens.com/blog/how-to-implement-oidc-with-microsoft-entra-id)

#### Issues

AADSTS500208: The domain is not a valid login domain for the account type:
* [Microsoft: Error codes](https://learn.microsoft.com/en-us/entra/identity-platform/reference-error-codes)

Post logout redirect not working:
* [StackOverflow: Microsoft post logout redirect uri not working](https://stackoverflow.com/questions/60145521/microsoft-post-logout-redirect-uri-not-working)
* [Microsoft: Post logout redirect uri does not work for certain apps](https://learn.microsoft.com/en-us/answers/questions/1656146/post-logout-redirect-uri-does-not-work-for-certain)

### Cloudflare Workers Coding

* [Jose Library](https://github.com/panva/jose)
  * [SignJWT](https://github.com/panva/jose/blob/HEAD/docs/jwt/sign/classes/SignJWT.md)
  * [Blog: Cookies and JWTs](https://fitech101.aalto.fi/en/courses/web-software-development/part-7/6-cookies-and-jwts)
* [Blog: Discord OIDC Worker](https://github.com/Erisa/discord-oidc-worker)
* [Blog: Cloudflare Workers and Azure AD](https://hajekj.net/2021/11/12/cloudflare-workers-and-azure-ad/)
* [Cloudflare: OpenAuth Template](https://github.com/cloudflare/templates/tree/main/openauth-template)

### Localhost Support

* [mkcert](https://github.com/FiloSottile/mkcert) - Making locally-trusted development certificates.
  * Install and initialize:
    ```bash
    brew install mkcert
    mkcert -install
    ```
* [aem cli localhost SSL](https://github.com/adobe/helix-cli#starting-development)
* [cloudflare wrangler dev](https://developers.cloudflare.com/workers/wrangler/commands/#dev)
  * also [environment variables](https://developers.cloudflare.com/workers/wrangler/system-environment-variables/)
  * possible commands
    ```bash
    npx wrangler dev --local-protocol=https --https-key-path=... --https-cert-path=...
    # or
    export WRANGLER_HTTPS_KEY_PATH=...
    export WRANGLER_HTTPS_CERT_PATH=...
    npx wrangler dev
    # maybe put into new command in package.json
    ```
### State param validation

* [StackOverflow: Is it safe to store the state parameter value in cookie?](https://security.stackexchange.com/questions/140883/is-it-safe-to-store-the-state-parameter-value-in-cookie)
* [cookie-signature](https://github.com/tj/node-cookie-signature) - no expiry
* [Blog: Creating and verifying JWTs using npm jose](https://medium.com/@hasindusithmin64/creating-and-verifying-jwts-using-npm-jose-a-step-by-step-guide-e07c4fdb3346)

## Email

* [AEM config for mail service](https://github.com/search?q=repo%3Aadobe%2Fspark-eds+smtp&type=code)
* [Sending emails with Outlook SMTP](https://learn.microsoft.com/en-us/exchange/mail-flow-best-practices/how-to-set-up-a-multifunction-device-or-application-to-send-email-using-microsoft-365-or-office-365)
  * [Oauth for Outlook SMTP](https://learn.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-smtp-application-by-using-oauth)

* [TCP sockets in CF workers](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/)
* [worker-mailer](https://github.com/zou-yu/worker-mailer) - works in CF but needs Node.js compat
  * Minimal [Node dependencies](https://github.com/search?q=repo%3Azou-yu%2Fworker-mailer%20crypto&type=code)
  * Can be replaced with [WebCrypto support in CF](https://developers.cloudflare.com/workers/runtime-apis/web-crypto/)
  * [hmac stuff for CRAM-MD5](https://github.com/zou-yu/worker-mailer/blob/9952d2bfffddaef5ef37a56a19b4f4fe9f6ba717/src/mailer.ts#L408)
  * [google search hmac with webcrypto](https://www.google.com/search?client=safari&rls=en&q=webcrypto+create+hmac+md5+hex&ie=UTF-8&oe=UTF-8)
  * [Fork with some fixes](https://github.com/wujiyu305/worker-mailer/commits/main/)
* [nodemailer](https://www.npmjs.com/package/nodemailer) - only works with Node.js
