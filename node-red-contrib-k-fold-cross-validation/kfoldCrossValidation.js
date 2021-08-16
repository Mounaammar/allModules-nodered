module.exports = function(RED) {
    function KfoldCrossValidationNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        // node.on('input', function(msg) {
        //node.status({ fill: "yellow", shape: "dot", text: "Executing ..." });
        //node.status({ fill: "green", shape: "dot", text: "Done" });
        //     msg.payload = msg.payload.toLowerCase();
        //     node.send(msg);
        // });
    }
    RED.nodes.registerType("kfoldCrossValidation",KfoldCrossValidationNode);
}