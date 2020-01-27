import { promises as fs, readFileSync, writeFileSync } from "fs"
import path from "path"
import readline from "readline"
import { google } from "googleapis"

export default class KeywordDataFetcher {
  private static readonly SCOPES: string[] = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
  ]
  private static readonly TOKEN_PATH = "./src/data/token.json"
  private static gsheetsData: string[][]

  public static async fetchKeysAndDescs(): Promise<string[][]> {
    const content: unknown = await fs.readFile(
      path.resolve("src", "data", "credentials.json")
    )

    await KeywordDataFetcher.authorize(
      JSON.parse(content as string),
      KeywordDataFetcher.listMajors
    )
    return KeywordDataFetcher.gsheetsData
  }

  /**
   * Create an OAuth2 client with the given credentials, and then execute the
   * given callback function.
   * @param {Object} credentials The authorization client credentials.
   * @param {function} callback The callback to call with the authorized client.
   */
  private static async authorize(
    credentials: any,
    callback: (oAuth2Client: any) => void
  ): Promise<void> {
    const { client_secret, client_id, redirect_uris } = credentials.installed
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    )

    // Check if we have previously stored a token.
    let token: unknown
    try {
      token = await fs.readFile(KeywordDataFetcher.TOKEN_PATH)
    } catch (err) {
      return await this.getNewToken(oAuth2Client, callback)
    }

    oAuth2Client.setCredentials(JSON.parse(token as string))
    await callback(oAuth2Client)
  }

  /**
   * Get and store new token after prompting for user authorization, and then
   * execute the given callback with the authorized OAuth2 client.
   * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
   * @param {getEventsCallback} callback The callback for the authorized client.
   */
  private static async getNewToken(
    oAuth2Client: any,
    callback: (oAuth2Client: any) => void
  ): Promise<void> {
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: KeywordDataFetcher.SCOPES,
    })
    // tslint:disable-next-line: no-console

    await KeywordDataFetcher.requestToken(oAuth2Client, authUrl).then(() =>
      callback(oAuth2Client)
    )
  }

  private static async requestToken(
    oAuth2Client: any,
    authUrl: any
  ): Promise<void> {
    return new Promise((res, rej) => {
      console.log("Authorize this app by visiting this url:", authUrl)
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      })
      rl.question("Enter the code from that page here: ", code => {
        rl.close()
        oAuth2Client.getToken(code, (err: any, token: any) => {
          if (err) {
            console.error("Error while trying to retrieve access token", err)
            rej()
          }
          // tslint:disable-next-line: no-console

          oAuth2Client.setCredentials(token)
          // Store the token to disk for later program executions

          writeFileSync(KeywordDataFetcher.TOKEN_PATH, JSON.stringify(token))

          // tslint:disable-next-line: no-console
          console.log("Token stored to", KeywordDataFetcher.TOKEN_PATH)
          res()
        })
      })
    })
  }

  /**
   * Prints the names and majors of students in a sample spreadsheet:
   * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
   * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
   */
  private static async listMajors(auth: any): Promise<void> {
    const sheets = google.sheets({ version: "v4", auth })
    const sheetData = await sheets.spreadsheets.values.get({
      spreadsheetId: "1TFVlpmELCoOniyCF1H8cTtc_IMnLgb5DfS8-L6omoDk",
      range: "A2:B",
    })

    // console.log(sheetData.data.values)
    KeywordDataFetcher.gsheetsData = sheetData.data.values as string[][]
  }
}
