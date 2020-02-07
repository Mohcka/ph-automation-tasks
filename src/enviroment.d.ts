import * as ts from "typescript"

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /**
       * Github Authorization token
       */
      GITHUB_AUTH_TOKEN: string
      /**
       * The status of the current enviroment
       */
      NODE_ENV: "development" | "production"
      /**
       * The enviroments configured port
       */
      PORT?: string
      /**
       * Who?
       */
      PWD: string
      /**
       * Username for the plesk interface
       */
      PLESK_USERNAME: string
      /**
       * Passward to login to the plesk interface
       */
      PLESK_PASSWORD: string
      /**
       * The default password when creating a new domain
       */
      DOMAIN_ADMIN_PASSWORD: string
      /**
       * The Pipeline deals api key
       */
      PIPELINE_DEALS_API_KEY: string
      /**
       * The pipeline deals api url
       */
      PIPELINE_DEALS_API_URL: string
      /**
       * Username to authenticate for elementor pro
       */
      ELEMENTOR_LOGIN_USERNAME: string
      /**
       * Elementor username to authenticate for elementor pro
       */
      ELEMENTOR_LOGIN_PASSWORD: string
      /**
       * Username to login to the namecheap interface
       */
      NAMECHEAP_USERNAME: string
      /**
       * Namecheap password
       */
      NAMECHEAP_PASSWORD: string
      /**
       * Mediatemple login email
       */
      MEDIATEMPLE_EMAIL: string
      /**
       * Mediatemple login password
       */
      MEDIATEMPLE_PASS: string
      /**
       * Api key to interact with the Google developer service
       */
      google_api_key: string
      /**
       * Google custom search id
       */
      google_cse_cx_id_1: string
      /**
       * Google sheets api key
       */
      google_sheets_api: string
      /**
       * Google sheets secrete
       */
      google_sheets_secret: string
      /**
       * Namecheap api key
       */
      NC_APIKEY: string
      /**
       * Namecheap login username
       */
      NC_USER: string
      /**
       * Whitelist IP address to interact with 
       */
      NC_IP: string
    }
  }
}
