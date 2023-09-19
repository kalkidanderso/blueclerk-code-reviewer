export interface IQBCurrenyRef {
    value: string
    name: string
}
export interface IQBAccount {
    [x: string]: any

    Name: string
    SubAccount: boolean
    FullyQualifiedName: string
    Active: boolean
    Classification: string
    AccountType: string
    AccountSubType: string
    CurrentBalance: number
    CurrentBalanceWithSubAccounts: number
    CurrencyRef:IQBCurrenyRef
    domain: string
    sparse: boolean
    Id: string
    SyncToken: string
    MetaData: any



}