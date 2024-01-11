/* eslint-disable no-undef */
/**
 * SampeCrudController
 *
 * @description :: Server-side actions for handling incoming requests.
 * @help        :: See https://sailsjs.com/docs/concepts/actions
 */
 const { calculateLimitAndOffset, paginate } = require("paginate-info");
 const uuid = require("uuid/v4");
 const otpGenerator = require('otp-generator');
 const bcrypt = require('bcryptjs');
 const DBPROP = require("../../../services/DBPROPOSAL");
const moment = require("moment");
 
 
 module.exports = {
 

   dataTransporter: async function(req, res) {
     
    const {
        query: {kode_transporter}
      } = req;
     await DB.poolConnect;
     console.log(req.query);
     try {
       const request = DB.pool.request();
       const requesteprop = await DBPROP.promise();


        let queryDataTablePendingShipment = ` SELECT COUNT(1) AS pending_shipment FROM delivery_order_v WHERE m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND kode_status = 'DOD'`;

        let dataPendingShipment = await request.query(queryDataTablePendingShipment);
        let pendingShipment = dataPendingShipment.recordset[0].pending_shipment;


        let queryDataTablePendingInvoice= `SELECT COUNT(1) AS pending_invoice FROM delivery_order_v do WHERE do.m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND do.kode_status = 'PODTRANS'
        AND do.delivery_order_id NOT IN(SELECT delivery_order_id FROM c_invoice WHERE m_transporter_id = do.m_transporter_id)`;

        let dataPendingInvoice = await request.query(queryDataTablePendingInvoice);
        let pendinginvoice = dataPendingInvoice.recordset[0].pending_invoice;


        let queryDataTablePendingPayment= `SELECT COUNT(1) AS pending_payment FROM c_invoice ci WHERE ci.kode_status= 'DR'
        AND ci.m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')`;

        let dataPendingPayment = await request.query(queryDataTablePendingPayment);
        let pendingPayment = dataPendingPayment.recordset[0].pending_payment;



        let obj = {
            pending_shipment : pendingShipment,
            pending_invoice : pendinginvoice,
            pending_payment : pendingPayment
        }
 
        return res.success({
            result: obj,
            message: "Fetch data successfully"
        });
              
     } catch (err) {
       return res.error(err);
     }
   },

   dataDoTransporter: async function(req, res) {
     
    const {
        query: {kode_transporter}
      } = req;
     await DBPROD.poolConnect;
     console.log(req.query);
     try {
       const request = DBPROD.pool.request();

        let tahun = moment().format('YYYY');
        let start_date = moment().add(-1,'M').date(1).format('YYYY-MM-DD');
        let end_date = moment().endOf('month').format('YYYY-MM-DD');

        let queryDataTableShipmentDraft = `SELECT COUNT(1) AS shipment FROM delivery_order_v WHERE m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND kode_status = 'DOD' AND YEAR(created) = '${tahun}' AND schedule_delivery_date BETWEEN '${start_date}' AND '${end_date}'`;


        console.log(queryDataTableShipmentDraft);
        

        let datShipmentDraft = await request.query(queryDataTableShipmentDraft);
        let shipmentDraft = datShipmentDraft.recordset[0].shipment;
        
        
        let queryDataTableShipmentAmount = `SELECT COALESCE(SUM(dod.jumlah * mpg.nett),0) AS amount FROM delivery_order_v do,delivery_order_detail dod,
        m_pricelist_grossnet mpg WHERE do.m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND do.kode_status = 'DOD' AND YEAR(do.created) = '${tahun}'
        AND do.delivery_order_id = dod.delivery_order_id
        AND mpg.m_produk_id = dod.m_produk_id 
        AND do.m_distributor_id = mpg.m_distributor_id
        AND do.schedule_delivery_date BETWEEN '${start_date}' AND '${end_date}'`;


        let dataShipmentDraftAmount = await request.query(queryDataTableShipmentAmount);
        let shipmentDraftAmountData = dataShipmentDraftAmount.recordset[0].amount;
        let shipmentDraftAmount = shipmentDraftAmountData;



        console.log('shipmentDraftAmount ',shipmentDraftAmount);


        let queryDataTableShipmentSampaiGudangEnesis = ` SELECT COUNT(1) AS shipment FROM delivery_order_v WHERE m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND kode_status = 'SGE' AND YEAR(created) = '${tahun}' AND schedule_delivery_date BETWEEN '${start_date}' AND '${end_date}'`;

        let datShipmentSampaiGudangEnesis  = await request.query(queryDataTableShipmentSampaiGudangEnesis);
        let shipmentSampaiGudangEnesis  = datShipmentSampaiGudangEnesis.recordset[0].shipment;




        let queryDataTableShipmentSampaiGudangEnesisAmount = `SELECT COALESCE(SUM(dod.jumlah * mpg.nett),0) AS amount FROM delivery_order_v do,delivery_order_detail dod,
        m_pricelist_grossnet mpg WHERE do.m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND do.kode_status = 'SGE' AND YEAR(do.created) = '${tahun}'
        AND do.delivery_order_id = dod.delivery_order_id
        AND mpg.m_produk_id = dod.m_produk_id 
        AND do.m_distributor_id = mpg.m_distributor_id
        AND do.schedule_delivery_date BETWEEN '${start_date}' AND '${end_date}'`;


        let dataShipmentSampaiGudangEnesisAmount = await request.query(queryDataTableShipmentSampaiGudangEnesisAmount);
        let shipmentSampaiGudangEnesisAmountData = dataShipmentSampaiGudangEnesisAmount.recordset[0].amount;
        let shipmentSampaiGudangEnesisAmount = shipmentSampaiGudangEnesisAmountData;

        console.log('shipmentSampaiGudangEnesisAmount ',shipmentSampaiGudangEnesisAmount);

        let queryDataTableShipmentPickingBarang = ` SELECT COUNT(1) AS shipment FROM delivery_order_v WHERE m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND kode_status = 'PIC' AND YEAR(created) = '${tahun}' AND schedule_delivery_date BETWEEN '${start_date}' AND '${end_date}'`;

        let datShipmentPickingBarang = await request.query(queryDataTableShipmentPickingBarang);
        let shipmentPickingBarang  = datShipmentPickingBarang.recordset[0].shipment;

        console.log('shipmentPickingBarang ',shipmentPickingBarang);

        let queryDataTableShipmentPickingBarangAmount = `SELECT COALESCE(SUM(dod.jumlah * mpg.nett),0) AS amount FROM delivery_order_v do,delivery_order_detail dod,
        m_pricelist_grossnet mpg WHERE do.m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND do.kode_status = 'PIC' AND YEAR(do.created) = '${tahun}'
        AND do.delivery_order_id = dod.delivery_order_id
        AND mpg.m_produk_id = dod.m_produk_id 
        AND do.m_distributor_id = mpg.m_distributor_id
        AND do.schedule_delivery_date BETWEEN '${start_date}' AND '${end_date}'`;


        let dataShipmentPickingBarangAmount = await request.query(queryDataTableShipmentPickingBarangAmount);
        let dataShipmentPickingBarangAmountData = dataShipmentPickingBarangAmount.recordset[0].amount;
        let shipmentPickingBarangAmount = dataShipmentPickingBarangAmountData;

        console.log('shipmentPickingBarangAmount ',shipmentPickingBarangAmount);

        let queryDataTableShipmentOtw = ` SELECT COUNT(1) AS shipment FROM delivery_order_v WHERE m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND kode_status = 'OTW' AND YEAR(created) = '${tahun}' AND schedule_delivery_date BETWEEN '${start_date}' AND '${end_date}'`;

        let datShipmentOtw = await request.query(queryDataTableShipmentOtw);
        let shipmentOtw  = datShipmentOtw.recordset[0].shipment;

        let queryDataTableShipmentOtwAmount = `SELECT COALESCE(SUM(dod.jumlah * mpg.nett),0) AS amount FROM delivery_order_v do,delivery_order_detail dod,
        m_pricelist_grossnet mpg WHERE do.m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND do.kode_status = 'OTW' AND YEAR(do.created) = '${tahun}'
        AND do.delivery_order_id = dod.delivery_order_id
        AND mpg.m_produk_id = dod.m_produk_id 
        AND do.m_distributor_id = mpg.m_distributor_id
        AND do.schedule_delivery_date BETWEEN '${start_date}' AND '${end_date}'`;

        console.log(queryDataTableShipmentOtwAmount);


        let dataShipmentOtwAmountAmount = await request.query(queryDataTableShipmentOtwAmount);
        let dataShipmentOtwAmountAmountData = dataShipmentOtwAmountAmount.recordset[0].amount;
        let shipmentOtwAmount = dataShipmentOtwAmountAmountData;

        console.log('shipmentOtwAmount ',shipmentOtwAmount);


        let queryDataTableShipmentSampaiLokasi = ` SELECT COUNT(1) AS shipment FROM delivery_order_v WHERE m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND kode_status = 'SPL' AND YEAR(created) = '${tahun}' AND schedule_delivery_date BETWEEN '${start_date}' AND '${end_date}'`;

        let datShipmentSampaiLokasi = await request.query(queryDataTableShipmentSampaiLokasi);
        let shipmentSampaiLokasi  = datShipmentSampaiLokasi.recordset[0].shipment;





        let queryDataTableShipmentSampaiLokasiAmount = `SELECT COALESCE(SUM(dod.jumlah * mpg.nett),0) AS amount FROM delivery_order_v do,delivery_order_detail dod,
        m_pricelist_grossnet mpg WHERE do.m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND do.kode_status = 'SPL' AND YEAR(do.created) = '${tahun}'
        AND do.delivery_order_id = dod.delivery_order_id
        AND mpg.m_produk_id = dod.m_produk_id 
        AND do.m_distributor_id = mpg.m_distributor_id
        AND do.schedule_delivery_date BETWEEN '${start_date}' AND '${end_date}'`;


        let dataShipmentSampaiLokasiAmount = await request.query(queryDataTableShipmentSampaiLokasiAmount);
        let dataShipmentSampaiLokasiAmountData = dataShipmentSampaiLokasiAmount.recordset[0].amount;
        let shipmentSampaiLokasiAmount = dataShipmentSampaiLokasiAmountData;

        console.log('shipmentSampaiLokasiAmount ',shipmentSampaiLokasiAmount);

        let queryDataTableShipmentPodDistributor = ` SELECT COUNT(1) AS shipment FROM delivery_order_v WHERE m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND kode_status = 'PODDIST' AND YEAR(created) = '${tahun}' AND schedule_delivery_date BETWEEN '${start_date}' AND '${end_date}'`;

        let datShipmentPodDistributor = await request.query(queryDataTableShipmentPodDistributor);
        let shipmentPodDistributor  = datShipmentPodDistributor.recordset[0].shipment;




        let queryDataTableShipmentPodDistributorAmount = `SELECT COALESCE(SUM(dod.jumlah * mpg.nett),0) AS amount FROM delivery_order_v do,delivery_order_detail dod,
        m_pricelist_grossnet mpg WHERE do.m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND do.kode_status = 'PODDIST' AND YEAR(do.created) = '${tahun}'
        AND do.delivery_order_id = dod.delivery_order_id
        AND mpg.m_produk_id = dod.m_produk_id 
        AND do.m_distributor_id = mpg.m_distributor_id
        AND do.schedule_delivery_date BETWEEN '${start_date}' AND '${end_date}'`;


        let dataShipmentPodDistributorAmount = await request.query(queryDataTableShipmentPodDistributorAmount);
        let dataShipmentPodDistributorAmountData = dataShipmentPodDistributorAmount.recordset[0].amount;
        let shipmentPodDistributorAmount = dataShipmentPodDistributorAmountData;
        

        console.log('shipmentPodDistributorAmount ',shipmentPodDistributorAmount);

        let queryDataTableShipmentFinish = ` SELECT COUNT(1) AS shipment FROM delivery_order_v WHERE m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND kode_status = 'FNS' AND YEAR(created) = '${tahun}' AND schedule_delivery_date BETWEEN '${start_date}' AND '${end_date}'`;

        let datShipmentFinish = await request.query(queryDataTableShipmentFinish);
        let shipmentFinish  = datShipmentFinish.recordset[0].shipment;



        let queryDataTableShipmentFinishAmount = `SELECT COALESCE(SUM(dod.jumlah * mpg.nett),0) AS amount FROM delivery_order_v do,delivery_order_detail dod,
        m_pricelist_grossnet mpg WHERE do.m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND do.kode_status = 'FNS' AND YEAR(do.created) = '${tahun}'
        AND do.delivery_order_id = dod.delivery_order_id
        AND mpg.m_produk_id = dod.m_produk_id 
        AND do.m_distributor_id = mpg.m_distributor_id
        AND do.schedule_delivery_date BETWEEN '${start_date}' AND '${end_date}'`;


        let dataShipmentFinishAmount = await request.query(queryDataTableShipmentFinishAmount);
        let dataShipmentFinishAmountData = dataShipmentFinishAmount.recordset[0].amount;
        let shipmentFinishAmount = dataShipmentFinishAmountData;


        console.log('dataShipmentFinishAmountData ',dataShipmentFinishAmountData);


        let queryDataTableShipmentPodLogistik = ` SELECT COUNT(1) AS shipment FROM delivery_order_v WHERE m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND kode_status = 'PODLOG' AND YEAR(created) = '${tahun}' AND schedule_delivery_date BETWEEN '${start_date}' AND '${end_date}'`;


        let datShipmentPodLogistik = await request.query(queryDataTableShipmentPodLogistik);
        let shipmentPodLogistik  = datShipmentPodLogistik.recordset[0].shipment;




        let queryDataTableShipmentPodLogistikAmount = `SELECT COALESCE(SUM(dod.jumlah * mpg.nett),0) AS amount FROM delivery_order_v do,delivery_order_detail dod,
        m_pricelist_grossnet mpg WHERE do.m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND do.kode_status = 'PODLOG' AND YEAR(do.created) = '${tahun}'
        AND do.delivery_order_id = dod.delivery_order_id
        AND mpg.m_produk_id = dod.m_produk_id 
        AND do.m_distributor_id = mpg.m_distributor_id
        AND do.schedule_delivery_date BETWEEN '${start_date}' AND '${end_date}'`;


        let dataShipmentPodLogistikAmount = await request.query(queryDataTableShipmentPodLogistikAmount);
        let dataShipmentPodLogistikAmountData = dataShipmentPodLogistikAmount.recordset[0].amount;
        let shipmentPodLogistikAmount = dataShipmentPodLogistikAmountData;


        console.log('shipmentPodLogistikAmount ',shipmentPodLogistikAmount);


        let queryDataTableShipmentPodTransporter = `SELECT COUNT(1) AS shipment FROM delivery_order_v WHERE m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND kode_status = 'PODTRANS' AND YEAR(created) = '${tahun}' AND schedule_delivery_date BETWEEN '${start_date}' AND '${end_date}'`;

        console.log(queryDataTableShipmentPodTransporter);

        let dataShipmentPodTransporter = await request.query(queryDataTableShipmentPodTransporter);

        console.log(dataShipmentPodTransporter);
        let shipmentPodTransporter  = dataShipmentPodTransporter.recordset[0].shipment;



        console.log('shipmentPodTransporter ',shipmentPodTransporter);


        let queryDataTableShipmentPodTransporterAmount = `SELECT COALESCE(SUM(dod.jumlah * mpg.nett),0) AS amount 
        FROM delivery_order_v do,delivery_order_detail dod,
        m_pricelist_grossnet mpg WHERE do.m_transporter_id 
        IN (SELECT m_transporter_id 
        FROM m_transporter_v mt WHERE mt.kode='${kode_transporter}')
        AND do.kode_status = 'PODTRANS' AND YEAR(do.created) = '${tahun}'
        AND do.delivery_order_id = dod.delivery_order_id
        AND mpg.m_produk_id = dod.m_produk_id 
        AND do.m_distributor_id = mpg.m_distributor_id
        AND do.schedule_delivery_date BETWEEN '${start_date}' AND '${end_date}'`;


        console.log(queryDataTableShipmentPodTransporterAmount);


        let dataShipmentPodTransporterAmount = await request.query(queryDataTableShipmentPodTransporterAmount);
        let dataShipmentPodTransporterAmountData = dataShipmentPodTransporterAmount.recordset[0].amount;
        let shipmentPodTransporterAmount = dataShipmentPodTransporterAmountData;


        console.log('shipmentPodTransporterAmount ',shipmentPodTransporterAmount);



        let totalRitase = shipmentDraft + shipmentSampaiGudangEnesis + 
        shipmentPickingBarang + shipmentOtw + shipmentSampaiLokasi + 
        shipmentPodDistributor + shipmentFinish + shipmentPodLogistik + shipmentPodTransporter;

        console.log('totalRitase ',totalRitase);


        let totalRitaseAmount = shipmentDraftAmount + shipmentSampaiGudangEnesisAmount + 
        shipmentPickingBarangAmount + shipmentOtwAmount + shipmentSampaiLokasiAmount + 
        shipmentPodDistributorAmount + shipmentFinishAmount + shipmentPodLogistikAmount + shipmentPodTransporterAmount;


        console.log('totalRitaseAmount ',totalRitaseAmount);

        let obj = {
            draft : {
              ritase : shipmentDraft,
              value : shipmentDraftAmount,
              url:`/transporter/tracking-do-driver?kode_status=DOD&tahun=${tahun}`

            },
            sampai_gudang_enesis : {
              ritase : shipmentSampaiGudangEnesis,
              value : shipmentSampaiGudangEnesisAmount,
              url:`/transporter/tracking-do-driver?kode_status=SGE&tahun=${tahun}`
            },
            picking_barang : {
              ritase : shipmentPickingBarang,
              value : shipmentPickingBarangAmount,
              url:`/transporter/tracking-do-driver?kode_status=PIC&tahun=${tahun}`
            },
            otw : {
              ritase : shipmentOtw,
              value : shipmentOtwAmount,
              url:`/transporter/tracking-do-driver?kode_status=OTW&tahun=${tahun}`
            },
            sampai_lokasi : {
              ritase : shipmentSampaiLokasi,
              value : shipmentSampaiLokasiAmount,
              url:`/transporter/tracking-do-driver?kode_status=SPL&tahun=${tahun}`
            },
            pod_distributor : {
              ritase : shipmentPodDistributor,
              value : shipmentPodDistributorAmount,
              url:`/transporter/tracking-do-driver?kode_status=PODDIST&tahun=${tahun}`
            },
            finish : {
              ritase : shipmentFinish,
              value : shipmentFinishAmount,
              url:`/transporter/tracking-do-driver?kode_status=FNS&tahun=${tahun}`
            },
            pod_logistik : {
              ritase : shipmentPodLogistik,
              value : shipmentPodLogistikAmount,
              url:`/transporter/tracking-do-driver?kode_status=PODLOG&tahun=${tahun}`
            },
            pod_transporter : {
              ritase : shipmentPodTransporter,
              value : shipmentPodTransporterAmount,
              url:`/transporter/tracking-do-driver?kode_status=PODTRANS&tahun=${tahun}`
            },
            totalRitase : totalRitase,
            totalRitaseAmount:totalRitaseAmount
        }

        
 
        return res.success({
            result: obj,
            message: "Fetch data successfully"
        });
              
     } catch (err) {
       return res.error(err);
     }
   },
 
   dataInvoice: async function(req, res) {
     
    const {
        query: {kode_transporter}
      } = req;
     await DBPROD.poolConnect;
     

     //console.log(req.query);
     try {
        const request = DBPROD.pool.request();

        let queryDataTableTotalDo = `SELECT COALESCE(SUM(nominal_invoice_sesudah_ppn),0) AS amount  FROM c_invoice_v ci WHERE kode='${kode_transporter}' 
        AND kode_status IN('DR','APL') `;

        let dataDeliveryOrder = await request.query(queryDataTableTotalDo);
        let dataDeliveryOrderAmount = dataDeliveryOrder.recordset[0].amount;


        let queryDataTableTotalSubmit = `SELECT COALESCE(SUM(nominal_invoice_sesudah_ppn),0) AS amount  FROM c_invoice_v ci WHERE kode='${kode_transporter}' 
        AND kode_status IN('APL') `;

        let dataDeliveryOrderSubmit = await request.query(queryDataTableTotalSubmit);
        let dataDeliveryOrderSubmitAmount = dataDeliveryOrderSubmit.recordset[0].amount;


        let queryDataTableTotalPayment = `SELECT COALESCE(SUM(nominal_invoice_sesudah_ppn),0) AS amount  FROM c_invoice_v ci WHERE kode='${kode_transporter}' 
        AND kode_status IN('APLHF') `;

        let dataDeliveryOrderPayment = await request.query(queryDataTableTotalPayment);
        let dataDeliveryOrderPaymentAmount = dataDeliveryOrderPayment.recordset[0].amount;

        let start_date = moment().add(-1,'M').date(1).format('YYYY-MM-DD');
        let end_date = moment().endOf('month').format('YYYY-MM-DD');


        let queryDataTableTotalDoDraft = `SELECT COALESCE(SUM(nominal_invoice_sesudah_ppn),0) AS amount FROM c_invoice_v ci WHERE kode='${kode_transporter}' 
        AND kode_status IN('DR') AND tanggal_invoice BETWEEN '${start_date}' AND '${end_date}'`;

        let dataDeliveryOrderDraft = await request.query(queryDataTableTotalDoDraft);
        let dataDeliveryOrderDraftAmount = dataDeliveryOrderDraft.recordset[0].amount;

        
        let queryDataTableTotalApproveLogistik = `SELECT COALESCE(SUM(nominal_invoice_sesudah_ppn),0) AS amount  
        FROM c_invoice_v ci WHERE kode='${kode_transporter}' 
        AND kode_status IN('APL') AND tanggal_invoice BETWEEN '${start_date}' AND '${end_date}'`;

        console.log(queryDataTableTotalApproveLogistik);

        let dataDeliveryOrderApproveLogistik = await request.query(queryDataTableTotalApproveLogistik);
        let dataDeliveryOrderApproveLogistikAmount = dataDeliveryOrderApproveLogistik.recordset[0].amount;


        let queryDataTableTotalApproveLogistikHead = `SELECT COALESCE(SUM(nominal_invoice_sesudah_ppn),0) AS amount 
        FROM c_invoice_v ci WHERE kode='${kode_transporter}' 
        AND kode_status IN('APLH') AND tanggal_invoice BETWEEN '${start_date}' AND '${end_date}'`;

        let dataDeliveryOrderApproveLogistikHead = await request.query(queryDataTableTotalApproveLogistikHead);
        let dataDeliveryOrderApproveLogistikHeadAmount = dataDeliveryOrderApproveLogistikHead.recordset[0].amount;


        let queryDataTableTotalApproveFinance = `SELECT COALESCE(SUM(nominal_invoice_sesudah_ppn),0) AS amount 
        FROM c_invoice_v ci WHERE kode='${kode_transporter}' 
        AND kode_status IN('APLHF') AND tanggal_invoice BETWEEN '${start_date}' AND '${end_date}'`;

        let dataDeliveryOrderApproveFinance = await request.query(queryDataTableTotalApproveFinance);
        let dataDeliveryOrderApproveFinanceAmount = dataDeliveryOrderApproveFinance.recordset[0].amount;

        
        console.log("start_date ",start_date);
        console.log("end_date ",end_date);

        let obj = {
            total_do :{
              value : dataDeliveryOrderAmount,
              url:'/transporter/submit-faktur'
            },
            total_submit :{
              value : dataDeliveryOrderSubmitAmount,
              url:'/transporter/submit-faktur'
            },
            total_pending :{
              value : dataDeliveryOrderAmount - dataDeliveryOrderSubmitAmount,
              url:'/transporter/submit-faktur'
            },
            total_payment :{
              value : dataDeliveryOrderPaymentAmount,
              url:'/transporter/submit-faktur'
            },
            total_draft:{
              value : dataDeliveryOrderDraftAmount,
              url:'/transporter/submit-faktur'
            },
            total_approve_logistik:{
              value : dataDeliveryOrderApproveLogistikAmount,
              url:'/transporter/submit-faktur'
            },
            total_approve_logistik_head:{
              value : dataDeliveryOrderApproveLogistikHeadAmount,
              url:'/transporter/submit-faktur'
            },
            total_approve_finance:{
              value : dataDeliveryOrderApproveFinanceAmount,
              url:'/transporter/submit-faktur'
            },
            total_invoice:{
              value: dataDeliveryOrderDraftAmount + dataDeliveryOrderApproveLogistikAmount + 
              dataDeliveryOrderApproveLogistikHeadAmount + dataDeliveryOrderApproveFinanceAmount
            }
        }
        // console.log(obj);
 
        return res.success({
            result: obj,
            message: "Fetch data successfully"
        });
              
     } catch (err) {
       return res.error(err);
     }
   },

 };
 