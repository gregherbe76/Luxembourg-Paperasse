#!/usr/bin/env node
/**
 * generate-faia.js — Génère un squelette de Fichier d'Audit Informatisé AED (FAIA)
 * au format XML SAF-T v2.01 (norme luxembourgeoise).
 *
 * Le FAIA est exigible par l'Administration de l'Enregistrement, des Domaines
 * et de la TVA (AED) lors de tout contrôle TVA depuis le 1er janvier 2011.
 *
 * Usage : node generate-faia.js <company.json> <transactions.json> > faia.xml
 */

import { readFileSync } from "node:fs";

function escape(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateFAIA(company, transactions) {
  const headerDate = new Date().toISOString().split("T")[0];
  const period = transactions.period || { start: "2025-01-01", end: "2025-12-31" };

  return `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:LU_2.01">
  <Header>
    <AuditFileVersion>2.01</AuditFileVersion>
    <AuditFileCountry>LU</AuditFileCountry>
    <AuditFileDateCreated>${headerDate}</AuditFileDateCreated>
    <SoftwareCompanyName>Paperasse Lux</SoftwareCompanyName>
    <SoftwareID>paperasse-lux</SoftwareID>
    <SoftwareVersion>0.1.0</SoftwareVersion>
    <Company>
      <RegistrationNumber>${escape(company.rcs)}</RegistrationNumber>
      <Name>${escape(company.raisonSociale)}</Name>
      <Address>
        <StreetName>${escape(company.siegeSocial.rue)}</StreetName>
        <City>${escape(company.siegeSocial.ville)}</City>
        <PostalCode>${escape(company.siegeSocial.codePostal)}</PostalCode>
        <Country>${escape(company.siegeSocial.pays || "LU")}</Country>
      </Address>
      <TaxRegistration>
        <TaxRegistrationNumber>${escape(company.matriculeTVA)}</TaxRegistrationNumber>
        <TaxAuthority>AED</TaxAuthority>
        <TaxType>VAT</TaxType>
      </TaxRegistration>
    </Company>
    <DefaultCurrencyCode>EUR</DefaultCurrencyCode>
    <SelectionCriteria>
      <PeriodStart>${period.start}</PeriodStart>
      <PeriodEnd>${period.end}</PeriodEnd>
    </SelectionCriteria>
    <TaxAccountingBasis>A</TaxAccountingBasis>
  </Header>

  <MasterFiles>
    <GeneralLedgerAccounts>
${(transactions.accounts || []).map((a) => `      <Account>
        <AccountID>${escape(a.id)}</AccountID>
        <AccountDescription>${escape(a.label)}</AccountDescription>
        <OpeningDebitBalance>${(a.openingDebit ?? 0).toFixed(2)}</OpeningDebitBalance>
        <OpeningCreditBalance>${(a.openingCredit ?? 0).toFixed(2)}</OpeningCreditBalance>
        <ClosingDebitBalance>${(a.closingDebit ?? 0).toFixed(2)}</ClosingDebitBalance>
        <ClosingCreditBalance>${(a.closingCredit ?? 0).toFixed(2)}</ClosingCreditBalance>
      </Account>`).join("\n")}
    </GeneralLedgerAccounts>

    <Customers>
${(transactions.customers || []).map((c) => `      <Customer>
        <CustomerID>${escape(c.id)}</CustomerID>
        <AccountID>${escape(c.accountId || "401")}</AccountID>
        <CustomerTaxID>${escape(c.tva || "")}</CustomerTaxID>
        <CompanyName>${escape(c.name)}</CompanyName>
      </Customer>`).join("\n")}
    </Customers>

    <Suppliers>
${(transactions.suppliers || []).map((s) => `      <Supplier>
        <SupplierID>${escape(s.id)}</SupplierID>
        <AccountID>${escape(s.accountId || "451")}</AccountID>
        <SupplierTaxID>${escape(s.tva || "")}</SupplierTaxID>
        <CompanyName>${escape(s.name)}</CompanyName>
      </Supplier>`).join("\n")}
    </Suppliers>

    <TaxTable>
      <TaxTableEntry><TaxType>VAT</TaxType><Description>Standard</Description><TaxPercentage>17.00</TaxPercentage></TaxTableEntry>
      <TaxTableEntry><TaxType>VAT</TaxType><Description>Intermediaire</Description><TaxPercentage>14.00</TaxPercentage></TaxTableEntry>
      <TaxTableEntry><TaxType>VAT</TaxType><Description>Reduit</Description><TaxPercentage>8.00</TaxPercentage></TaxTableEntry>
      <TaxTableEntry><TaxType>VAT</TaxType><Description>Super-reduit</Description><TaxPercentage>3.00</TaxPercentage></TaxTableEntry>
      <TaxTableEntry><TaxType>VAT</TaxType><Description>Exoneration</Description><TaxPercentage>0.00</TaxPercentage></TaxTableEntry>
    </TaxTable>
  </MasterFiles>

  <GeneralLedgerEntries>
    <NumberOfEntries>${(transactions.entries || []).length}</NumberOfEntries>
    <TotalDebit>${(transactions.totalDebit ?? 0).toFixed(2)}</TotalDebit>
    <TotalCredit>${(transactions.totalCredit ?? 0).toFixed(2)}</TotalCredit>
${(transactions.entries || []).map((e) => `    <Journal>
      <JournalID>${escape(e.journalId)}</JournalID>
      <Description>${escape(e.description || "")}</Description>
      <Transaction>
        <TransactionID>${escape(e.id)}</TransactionID>
        <Period>${escape(e.period || "")}</Period>
        <TransactionDate>${escape(e.date)}</TransactionDate>
        <Lines>
${(e.lines || []).map((l) => `          <${l.debit > 0 ? "DebitLine" : "CreditLine"}>
            <RecordID>${escape(l.id)}</RecordID>
            <AccountID>${escape(l.accountId)}</AccountID>
            <Description>${escape(l.description || "")}</Description>
            <${l.debit > 0 ? "DebitAmount" : "CreditAmount"}>${(l.debit || l.credit).toFixed(2)}</${l.debit > 0 ? "DebitAmount" : "CreditAmount"}>
          </${l.debit > 0 ? "DebitLine" : "CreditLine"}>`).join("\n")}
        </Lines>
      </Transaction>
    </Journal>`).join("\n")}
  </GeneralLedgerEntries>
</AuditFile>`;
}

const [, , companyPath, txPath] = process.argv;
if (!companyPath || !txPath) {
  console.error("Usage: node generate-faia.js <company.json> <transactions.json> > faia.xml");
  process.exit(1);
}

const company = JSON.parse(readFileSync(companyPath, "utf8"));
const transactions = JSON.parse(readFileSync(txPath, "utf8"));
console.log(generateFAIA(company, transactions));
