const { EmployeeBankDetail } = require('../models');
const { stripCompanyFromBody, assertEmployeeInCompany, withCompanyId } = require('../utils/companyScope');
const { validateUaeIban } = require('../services/payroll/payrollIbanValidator');

exports.updateWpsBank = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    await assertEmployeeInCompany(req.params.id, req);

    if (body.iban) {
      const check = validateUaeIban(body.iban);
      if (!check.valid) return res.status(400).json({ message: check.message });
      body.iban = check.normalized;
    }

    let bank = await EmployeeBankDetail.findOne({
      where: { companyId: req.companyId, employeeId: req.params.id, isPrimary: true },
    });

    const payload = {
      bankName: body.bank_name,
      accountNumber: body.account_number,
      iban: body.iban,
      swiftCode: body.swift_code,
      bankCode: body.bank_code,
      salaryCardNo: body.salary_card_no,
      labourCardNo: body.labour_card_no,
      molPersonalId: body.mol_personal_id,
      wpsEnabled: body.wps_enabled !== undefined ? body.wps_enabled : true,
      paymentMethod: body.payment_method || 'BANK_TRANSFER',
      isPrimary: true,
    };

    if (bank) {
      await bank.update(payload);
    } else {
      bank = await EmployeeBankDetail.create(
        withCompanyId(req, { employeeId: Number(req.params.id), ...payload })
      );
    }

    res.json({ success: true, data: bank });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};
