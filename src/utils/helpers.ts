export default class Helpers {
  public static removeCityState(strToParse: string): string{
    return strToParse.replace(/([A-z]+),? [A-Z]{2}/, "")
  }
}