/* eslint-disable no-undef */
/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes tell Sails what to do each time it receives a request.
 *
 * For more information on configuring custom routes, check out:
 * https://sailsjs.com/anatomy/config/routes-js
 */

const cmo = require("../api/routes/CMORoute");
const rpo = require("../api/routes/RPORoute");
const order = require("../api/routes/OrderRoute");
const kendaraan = require("../api/routes/KendaraanRoute");
const driver = require("../api/routes/DriverRoute");
const jenisorganisasi = require("../api/routes/JenisOrganisasiRoute");
const userorganisasi = require("../api/routes/UserOrganisasiRoute");
const organisasi = require("../api/routes/OrganisasiRoute");
const role = require("../api/routes/RoleRoute");
const rolemenu = require("../api/routes/RoleMenuRoute");
const distributor = require("../api/routes/DistributorRoute");
const pajak = require("../api/routes/PajakRoute");
const dropdown = require("../api/routes/DropdownRoute");
const ordertosap = require("../api/routes/OrderToSapRoute");
const produk = require("../api/routes/ProdukRoute");
const shipment = require("../api/routes/ShipmentRoute");
const users = require("../api/routes/UsersRoute");
const transporter = require("../api/routes/TransporterRoute");
const biddingshipment = require("../api/routes/BiddingShipmentRoute");
const menu = require("../api/routes/MenuRoute");
const registrasi = require("../api/routes/RegistrasiDistributorRoute");
const absent = require("../api/routes/AbsentRoute");
const tracking = require("../api/routes/TrackingOrderRoute");
const deliveryorder = require("../api/routes/DeliveryOrderRoute");
const trackingPlafond = require("../api/routes/TrackingPlafondRoute");
const termofpayment = require("../api/routes/TermOfPaymentRoute");
const requesttop = require("../api/routes/RequestTopRoute");
const dev = require("../api/routes/DevRoute");
const contract = require("../api/routes/ContractRoute");
const submitfaktur = require("../api/routes/SubmitFakturRoute");
const fakturBiayaLain = require("../api/routes/FakturBiayaLainRoute");
const uploadfkr = require("../api/routes/UploadFkrRoute");
const fkr = require("../api/routes/FkrRoute");
const fkreksekusi = require("../api/routes/FkrDetailEksekusiRoute");
const klaimproposal = require("../api/routes/klaim/KlaimProposalRoute");
const documentnumber = require("../api/routes/DocumentNumberRoute");
const newbelajar = require("../api/routes/NewRoute");
const consolenumber = require("../api/routes/ConsoleNumberRoute");
const cmoapprove = require("../api/routes/CMOApproveRoute");
const proposal = require("../api/routes/eproposal/ProposalRoute");
const brandbudget = require("../api/routes/eproposal/BrandBudgetRoute");
const budgetactivity = require("../api/routes/eproposal/BudgetActivityRoute");
const budgeting = require("../api/routes/eproposal/BudgetingRoute");
const budgetyear = require("../api/routes/eproposal/BudgetYearRoute");
const division = require("../api/routes/eproposal/master/DivisionRoute");
const region = require("../api/routes/eproposal/master/RegionRoute");
const diskonb2b = require("../api/routes/Diskonb2bRoute");
const executor = require("../api/routes/eproposal/master/ExecutorRoute");
const markettype = require("../api/routes/eproposal/master/MarketTypeRoute");
const branch = require("../api/routes/eproposal/master/BrancRoute");
const brand = require("../api/routes/eproposal/master/BrandRoute");
const variant = require("../api/routes/eproposal/master/VariantRoute");
const activity = require("../api/routes/eproposal/master/ActivityRoute");
const distributor_eprop = require("../api/routes/eproposal/master/DistributorRoute");
const budgetapproval = require("../api/routes/eproposal/BudgetApprovalRoute");
const kirimproposal = require("../api/routes/eproposal/KirimProposalRoute");
const proposaledit = require("../api/routes/eproposal/ProposalEditRoute");
const copyproposal = require("../api/routes/eproposal/ProposalCopyRoute");
const copyrevisiproposal = require("../api/routes/eproposal/ProposalCopyRevisiRoute");
const deleteproposal = require("../api/routes/eproposal/ProposalDeleteRoute");
const dashboardeprop = require("../api/routes/eproposal/DashboardRoute");
const company = require("../api/routes/eproposal/master/CompanyRoute");
const employee = require("../api/routes/eproposal/master/EmployeeRoute");
const workflow = require("../api/routes/eproposal/master/WorkflowRoute");
const position = require("../api/routes/eproposal/master/PositionRoute");
const groupactivity = require("../api/routes/eproposal/master/GroupActivityRoute");
const quarter = require("../api/routes/eproposal/master/QuarterRoute");
const cetakproposal = require("../api/routes/eproposal/CetakProposalRoute");
const logbook = require("../api/routes/eproposal/report/LogbookRoute");
const status = require("../api/routes/eproposal/master/StatusRoute");
const mappingorganisasi = require("../api/routes/MapingOrganisasiRoute");
const payment = require("../api/routes/eproposal/report/PaymentRoute");
const oee = require("../api/routes/OeeRoute");
const mesin = require("../api/routes/MesinRoute");
const plant = require("../api/routes/PlantRoute");
const pricelist = require("../api/routes/PricelistRoute");
const datacentercustomer = require("../api/routes/DatabaseCenterCustomerRoute");
const parking = require("../api/routes/parking/ParkingRoute");
const tanggalcmo = require("../api/routes/TanggalCmoRoute");
const printinvoicetransporter = require("../api/routes/print/PrintInvoiceTransporterRoute");
const generateinvoicetransporter = require("../api/routes/print/GenerateInvoiceTransporterRoute");
const uploadskureplacement = require("../api/routes/upload/UploadSkuReplacementRoute");
const maintaindataabsen = require("../api/routes/MaintainDataAbsenRoute");
const listuseresales = require("../api/routes/report/ListUserRoute");
const MasterDistributor = require("../api/routes/MasterDistributorRoute");
const cmogenerateorderdetail = require("../api/routes/cmo/RetransformCmoRoute");
const uploadhargasatuanterkecil = require("../api/routes/upload/UploadPricelistSatuanTerkecilRoute");
const hargasatuanterkecil = require("../api/routes/master/HargaSatuanTerkecilRoute");
const uploadresheduleweek = require("../api/routes/upload/UploadRescheduleCmoRoute");
const uploadqtyadjustment = require("../api/routes/upload/UploadQtyAdjustmentRoute");
const uploaddetailmesinoee = require("../api/routes/upload/UploadDetailMesinOeeRoute");
const uploadgrossnet = require("../api/routes/upload/UploadGrossNetPricelistRoute");
const oeedashboarpgd = require("../api/routes/oee/OeeDashboardPgdRoute");
const blastemailsms = require("../api/routes/centraldatabase/BlastEmailSmsRoute");
const apiTesterController = require("../api/controllers/dev/ApiTesterController");
const disciplinary = require("../api/routes/disciplinary/DisciplinaryRoute");
const printSp = require("../api/routes/disciplinary/PrintSpRoute");
const alternativesupplier = require("../api/routes/alternativesupplier/AlternativeSupplierRoute");
const companyidlist = require("../api/routes/disciplinary/CompanyIdFromOrangeRoute");
const employeeoragelist = require("../api/routes/disciplinary/EmployeeListFromOrangeRoute");
const oeedashboardtop10lowest = require("../api/routes/oee/OeeDashboardTop10LowestRoute");
const oeedashboardperformancerate = require("../api/routes/oee/OeeDashboardPerformanceRateRoute");
const oeedashboardavailabilityrate = require("../api/routes/oee/OeeDashboardAvailabilityRateRoute");
const oeedashboardqualityrate = require("../api/routes/oee/OeeDashboardQualityRateRoute");
const oeedashboardselectparam = require("../api/routes/oee/OeeDashboardParamPeriodPlantRoute");
const kendaraantransporterroute = require("../api/routes/master/KendaraanTransporterRoute");
const mastersinkronisasidepartment = require("../api/routes/master/sinkronisasi/SinkronisasiDataDepartmentRoute");
const disciplinaryemail = require("../api/routes/disciplinary/email/EmailDisciplinaryRoute");
const alternativesupplieremail = require("../api/routes/alternativesupplier/email/EmailCreateRoute");
const reducebudget = require("../api/routes/upload/ReduceBudgetRoute");
const parkingformmobile = require("../api/routes/parking/ParkingFormMobileController");
const oeerawdata = require("../api/routes/oee/OeeRawDataRoute");
const oeelossdata = require("../api/routes/oee/OeeLossDataRoute");
const oeedailymonthly = require("../api/routes/oee/OeeDailyMonthlyRoute");
const uploadbudget = require("../api/routes/eproposal/UploadBudgetEproposalRoute");
const dataapprovallist = require("../api/routes/dashboard/DataApprovalRoute");
const datadashboarddistributor = require("../api/routes/dashboard/DataDashboardDistributorRoute");
const datadashboardtransporter = require("../api/routes/dashboard/DataDashboardTransporterRoute");
const pendingApprovalEpropRoute = require("../api/routes/report/PendingApprovalEpropRoute");
const epropSendToSapRoute = require("../api/routes/eproposal/EpropSendToSapRoute");
const costRasioRoute = require("../api/routes/eproposal/CostRasioRoute");
const rolesroute = require("../api/routes/roles/RolesRoute");
const materialroute = require("../api/routes/master/MaterialRoute");
const vendoroute = require("../api/routes/master/VendorRoute");
const reversalbudget = require("../api/routes/eproposal/ReversalBudgetRoute");
const workflowalternativesupplier = require("../api/routes/alternativesupplier/WorkflowAlternativeSupplierRoute");
const workflowalternativesupplierdetail = require("../api/routes/alternativesupplier/WorkflowAlternativeSupplierDetailRoute");
const periodeeproposal = require("../api/routes/eproposal/PeriodeEproposalRoute");
const klaimnpwpnotmatch = require("../api/routes/KlaimNpwpNotMatchRoute");
const deliverybundle = require("../api/routes/DeliveryBundleRoute");
const getklaimroute = require("../api/routes/eproposal/GetKlaimRoute");
const downtimeversusoee = require("../api/routes/oee/OeeDowntimeVersusOeeRoute");
const oeedasboardlosstime = require("../api/routes/oee/OeeDashboardLossDataRoute");
const biddingreject = require("../api/routes/BiddingRejectRoute");
const deliverybundlependingapproval = require("../api/routes/DeliveryBundlePendingApprovalRoute");
const bucketbiddingroute = require("../api/routes/BucketBiddingRoute");
const enesishrroute = require("../api/routes/master/EnesisHrRoute");
const deliveryordercheck = require("../api/routes/DeliveryOrderCheckRoute");
const departmentroutealternativesupplier = require("../api/routes/alternativesupplier/master/DepartmentRoute");
const billingroute = require("../api/routes/BillingRoute");
const rejectpod = require("../api/routes/RejectPodRoute");
const groupkategoriroute = require("../api/routes/alternativesupplier/master/GroupKategoriRoute");
const uploaddokumenklaim = require("../api/routes/upload/UploadKlaimRoute");
const SyncDataLogbookController = require("../api/routes/eproposal/report/SyncDataLogbookRoute");
const GetDataPoByNomorDoRoute = require("../api/routes/submitfaktur/GetDataPoByNomorDoRoute");
const MaintenanceRoute = require("../api/routes/maintenance/MaintenanceRoute");
const LeadTimeRoute = require("../api/routes/master/LeadTimeRoute");
const AcpRoute = require("../api/routes/master/AcpRoute");
const tujuanDistributorRoute = require("../api/routes/fkr/TujuanDistributorRoute");
const DownloadBeritaAcaraRoute = require("../api/routes/fkr/DownloadBeritaAcaraRoute");
const AddCostRoute = require("../api/routes/eproposal/AddCostRoute");

const RegenerateSoFKRRoute = require("../api/routes/fkr/RegenerateSoFKRRoute");
const DistributionChannelRoute = require("../api/routes/master/DistributionChannelRoute");
const UploadUpdateTonaseKubikasiSkuRoute = require("../api/routes/upload/UploadUpdateTonaseKubikasiSkuRoute");
const TarikNpwpRoute = require("../api/routes/master/TarikNpwpRoute");
const UploadUpdateNpwpRekeningTransporterRoute = require("../api/routes/upload/UploadUpdateNpwpRekeningTransporterRoute");
const UploadNewTransporterRoute = require("../api/routes/upload/UploadNewTransporterRoute");
const UploadReversalRoute = require("../api/routes/upload/UploadReversalRoute");
const UploadReplaceQuantityRoute = require("../api/routes/upload/UploadReplaceQuantityRoute");
const GetProposalKlaimMinusReversalRoute = require("../api/routes/eproposal/GetProposalKlaimMinusReversalRoute");
const UpddateTitleEpropRoute = require("../api/routes/upload/UpdateTitleEpropRoute");
const UploadRegenerateXmlCmoRoute = require("../api/routes/upload/UploadRegenerateXmlCmoRoute");
const UploadReplaceNomorProposalKlaimRoute = require("../api/routes/upload/UploadReplaceNomorProposalKlaimRoute");

//general
const general = require("../api/routes/General/GeneralRoute");
const KlaimDirectOutlet = require("../api/routes/KlaimDirectOutletRoute");
const ValidationReversalRoute = require("../api/routes/upload/ValidationReversalRoute");
const GenerateUlangDetailBillingTransporterRoute = require("../api/routes/submitfaktur/GenerateUlangDetailBillingTransporterRoute");
const SummaryEpropRoute = require("../api/routes/eproposal/report/SummaryEpropRoute");
const UploadRejectKlaimBySystemRoute = require("../api/routes/upload/UploadRejectKlaimBySystemRoute");
const SummaryEpropByPoRoute = require("../api/routes/eproposal/report/SummaryEpropByPoRoute");
const SummaryByKlaimManualRoute = require("../api/routes/eproposal/report/SummaryByKlaimManualRoute");
const ApprovalAddCostRoute = require("../api/routes/submitfaktur/ApprovalAddCostRoute");
const AddCostTransporterRoute = require("../api/routes/submitfaktur/AddCostTransporterRoute");
const DataEnigmaRoute = require("../api/routes/enigma/DataEnigmaRoute");
const FkrMappingSatuanTerkecilRoute = require("../api/routes/master/FkrMappingSatuanTerkecilRoute");
const LockCreateEpropRoute = require("../api/routes/eproposal/LockCreateEpropRoute");
const UploadMasterPphRoute = require("../api/routes/upload/UploadMasterPphRoute");

//SETTLEMENT VA
const PembayaranEpropRoute = require("../api/routes/settlementva/PembayaranEpropRoute");
const PrintSettlementVaPembayaranEpropRoute = require("../api/routes/settlementva/PrintSetllementVaPembayaranEpropRoute");
const BiayaOperasionalRoute = require("../api/routes/settlementva/BiayaOperasionalRoute");
const SubmitSettlementVaPaymentEpropRoute = require("../api/routes/settlementva/SubmitSettlementVaPaymentEpropRoute");


const DataApprovalCmoRoute = require("../api/routes/cmo/DataApprovalCmoRoute");


const UploadIOMFkrRoute = require("../api/routes/fkr/UploadIOMFkrRoute");



let route = [];

route.push(kendaraantransporterroute.route);
route.push(oeerawdata.route);
route.push(oeedailymonthly.route);
route.push(oeelossdata.route);
route.push(parkingformmobile.route);
route.push(MasterDistributor.route);
route.push(uploadskureplacement.route);
route.push(parking.route);
route.push(tanggalcmo.route);
route.push(generateinvoicetransporter.route);
route.push(printinvoicetransporter.route);
route.push(datacentercustomer.route);
route.push(pricelist.route);
route.push(payment.route);
route.push(mappingorganisasi.route);
route.push(status.route);
route.push(logbook.route);
route.push(cetakproposal.route);
route.push(quarter.route);
route.push(groupactivity.route);
route.push(position.route);
route.push(workflow.route);
route.push(employee.route);
route.push(company.route);
route.push(dashboardeprop.route);
route.push(deleteproposal.route);
route.push(copyrevisiproposal.route);
route.push(copyproposal.route);
route.push(proposaledit.route);
route.push(kirimproposal.route);
route.push(budgetapproval.route);
route.push(distributor_eprop.route);
route.push(activity.route);
route.push(variant.route);
route.push(brand.route);
route.push(branch.route);
route.push(markettype.route);
route.push(executor.route);
route.push(region.route);
route.push(division.route);
route.push(budgetyear.route);
route.push(diskonb2b.route);
route.push(budgeting.route);
route.push(budgetactivity.route);
route.push(brandbudget.route);
route.push(proposal.route);
route.push(cmo.route);
route.push(rpo.route);
route.push(kendaraan.route);
route.push(jenisorganisasi.route);
route.push(organisasi.route);
route.push(userorganisasi.route);
route.push(role.route);
route.push(rolemenu.route);
route.push(order.route);
route.push(distributor.route);
route.push(pajak.route);
route.push(dropdown.route);
route.push(ordertosap.route);
route.push(produk.route);
route.push(shipment.route);
route.push(users.route);
route.push(transporter.route);
route.push(biddingshipment.route);
route.push(menu.route);
route.push(registrasi.route);
route.push(absent.route);
route.push(tracking.route);
route.push(deliveryorder.route);
route.push(dev.route);
route.push(trackingPlafond.route);
route.push(termofpayment.route);
route.push(requesttop.route);
route.push(contract.route);
route.push(driver.route);
route.push(submitfaktur.route);
route.push(fakturBiayaLain.route);
route.push(uploadfkr.route);
route.push(fkr.route);
route.push(fkreksekusi.route);
route.push(klaimproposal.route);
route.push(newbelajar.route);
route.push(documentnumber.route);
route.push(consolenumber.route);
route.push(cmoapprove.route);
route.push(oee.route);
route.push(mesin.route);
route.push(plant.route);
route.push(maintaindataabsen.route);
route.push(listuseresales.route);
route.push(cmogenerateorderdetail.route);
route.push(uploadhargasatuanterkecil.route);
route.push(hargasatuanterkecil.route);
route.push(uploadresheduleweek.route);
route.push(uploadqtyadjustment.route);
route.push(uploaddetailmesinoee.route);
route.push(uploadgrossnet.route);
route.push(oeedashboarpgd.route);
route.push(blastemailsms.route);
route.push(apiTesterController.route);
route.push(disciplinary.route);
route.push(printSp.route);
route.push(alternativesupplier.route);
route.push(companyidlist.route);
route.push(employeeoragelist.route);
route.push(oeedashboardtop10lowest.route);
route.push(oeedashboardperformancerate.route);
route.push(oeedashboardavailabilityrate.route);
route.push(oeedashboardqualityrate.route);
route.push(oeedashboardselectparam.route);
route.push(mastersinkronisasidepartment.route);
route.push(disciplinaryemail.route);
route.push(alternativesupplieremail.route);
route.push(reducebudget.route);
route.push(uploadbudget.route);
route.push(dataapprovallist.route);
route.push(datadashboarddistributor.route);
route.push(datadashboardtransporter.route);
route.push(pendingApprovalEpropRoute.route);
route.push(epropSendToSapRoute.route);
route.push(costRasioRoute.route);
route.push(rolesroute.route);
route.push(general.route);
route.push(materialroute.route);
route.push(vendoroute.route);
route.push(reversalbudget.route);
route.push(workflowalternativesupplier.route);
route.push(workflowalternativesupplierdetail.route);
route.push(periodeeproposal.route);
route.push(klaimnpwpnotmatch.route);
route.push(deliverybundle.route);
route.push(getklaimroute.route);
route.push(downtimeversusoee.route);
route.push(oeedasboardlosstime.route);
route.push(biddingreject.route);
route.push(deliverybundlependingapproval.route);
route.push(bucketbiddingroute.route);
route.push(enesishrroute.route);
route.push(deliveryordercheck.route);
route.push(departmentroutealternativesupplier.route);
route.push(billingroute.route);
route.push(rejectpod.route);
route.push(groupkategoriroute.route);
route.push(uploaddokumenklaim.route);
route.push(SyncDataLogbookController.route);
route.push(tujuanDistributorRoute.route);
route.push(DownloadBeritaAcaraRoute.route);
route.push(GetDataPoByNomorDoRoute.route);
route.push(MaintenanceRoute.route);
route.push(LeadTimeRoute.route);
route.push(AcpRoute.route);
route.push(AddCostRoute.route);
route.push(RegenerateSoFKRRoute.route);
route.push(DistributionChannelRoute.route);
route.push(UploadUpdateTonaseKubikasiSkuRoute.route);
route.push(TarikNpwpRoute.route);

route.push(UploadUpdateNpwpRekeningTransporterRoute.route);
route.push(UploadNewTransporterRoute.route);
route.push(UploadReversalRoute.route);
route.push(UploadReplaceQuantityRoute.route);
route.push(GetProposalKlaimMinusReversalRoute.route);
route.push(UpddateTitleEpropRoute.route);
route.push(UploadRegenerateXmlCmoRoute.route);
route.push(UploadReplaceNomorProposalKlaimRoute.route);
route.push(ValidationReversalRoute.route);


//  new
route.push(KlaimDirectOutlet.route);
route.push(GenerateUlangDetailBillingTransporterRoute.route);
route.push(SummaryEpropRoute.route);
route.push(UploadRejectKlaimBySystemRoute.route);
route.push(ApprovalAddCostRoute.route);
route.push(AddCostTransporterRoute.route);
route.push(SummaryEpropByPoRoute.route);
route.push(SummaryByKlaimManualRoute.route);
route.push(DataEnigmaRoute.route);
route.push(FkrMappingSatuanTerkecilRoute.route);
route.push(LockCreateEpropRoute.route);
route.push(UploadMasterPphRoute.route);

//SETTLEMENT VA
route.push(PembayaranEpropRoute.route);
route.push(PrintSettlementVaPembayaranEpropRoute.route);
route.push(BiayaOperasionalRoute.route);
route.push(SubmitSettlementVaPaymentEpropRoute.route);

route.push(DataApprovalCmoRoute.route);

route.push(UploadIOMFkrRoute.route);




// Dynamic include custom routes from api
var registerRoute = function (dic) {
  var obj = {};
  dic.forEach((routes) => {
    for (p in routes) {
      obj[p] = routes[p];
    }
  });

  return obj;
};

module.exports.routes = registerRoute(route);
