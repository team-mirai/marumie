/** 政治団体の入力の誤り。メッセージはそのまま画面に出してよい */
export class PoliticalOrganizationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PoliticalOrganizationInputError";
  }
}
