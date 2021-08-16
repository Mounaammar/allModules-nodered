module.exports = function(RED) {
    function xgboostNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;
        // node.on('input', function(msg) {
        //    node.status({ fill: "yellow", shape: "dot", text: "Executing ..." });
        //     msg.payload = msg.payload.toLowerCase();
        //     node.send(msg);
      //  node.status({ fill: "green", shape: "dot", text: "Done" });
        // });
    }
    RED.nodes.registerType("xgboost", xgboostNode);
}