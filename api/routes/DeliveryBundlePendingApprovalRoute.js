// eslint-disable-next-line no-undef
module.exports.route = {
    "GET /delivery-bundle-pending-approval": "transactions/DeliveryBundlePendingApprovalController.find",
    "GET /delivery-bundle-pending-approval/:id": "transactions/DeliveryBundlePendingApprovalController.findOne",
};