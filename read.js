/*
Scrapbook Easy Viewer
Author mailfcl@126.com
*/
String.prototype.escape = function(chars, slashed) {
    return this.replace(new RegExp((slashed ? "\\\\":"") + "([" + chars + "])", "g"), function(a, b) {
        return "&#" + b.charCodeAt(0) +";"
    });
}
String.prototype.fillData = function(data) {
    function v(s){
        var parts = s.split("."), d = data, r;
        for(var i=0;i<parts.length;i++){
            var p = parts[i];
            if(p){r = d[p]; d = r}
            if(!d) break;
        }
        return r;
    }
    var c = 1;
    var s = this.replace(/{([\s\S]+)}/g, function(a, b) {
        return "{" + b.escape("?:!", true) + "}";
    });
    while(c) {
        c = 0;
        s = s.replace(/\{([^\{\}]+?)\}/g, function(match, key) {
            var m = null, r;  
            if(m = key.match(/^([\s\S]+?)\!([\s\S]*?)(?:\:([\s\S]*))?$/)) {
                r = !v(m[1]) ? m[2] : (typeof(m[3]) !="undefined" ? m[3] : "");
            } else if(m = key.match(/^([\s\S]+?)\?([\s\S]*?)(?:\:([\s\S]*))?$/)) {
                r = v(m[1]) ? m[2] : (typeof(m[3]) !="undefined" ? m[3] : "");
            } else {
                var t = v(key);
                r = typeof(t) != "undefined" ? String(t).escape("?:!", false) : "";
            }
            c = 1;
            return r;
        });
    }
    return s;
}
String.prototype.htmlEncode = function(value) {
    return $('<div/>').text(this).html();
}
var xmlhttp=new XMLHttpRequest();
function nsResolver(prefix) {
    var ns = {
        'NS1' :'http://amb.vis.ne.jp/mozilla/scrapbook-rdf#',
        'NC': 'http://home.netscape.com/NC-rdf#',
        'RDF': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'
    };
    return ns[prefix] || null;
}
function getDescNode(doc, about){
    var search = '//RDF:Description[@RDF:about="'+ about +'"]';
    var result = doc.evaluate(search, doc, nsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    return result.iterateNext(); 
}
function getSeqNode(doc, about){
    var search = '//RDF:Seq[@RDF:about="'+about+'"]';
    var result = doc.evaluate(search, doc, nsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    return result.iterateNext(); 
}
function getDecSeparator(doc, about){
    var search = '//NC:BookmarkSeparator[@RDF:about="'+about+'"]';
    var result = doc.evaluate(search, doc, nsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    return result.iterateNext(); 
}
xmlhttp.onload = function() {    
    var xmlDoc = new DOMParser().parseFromString(xmlhttp.responseText,'text/xml');
    var x=xmlDoc.getElementsByTagName("RDF:Seq");
    var root_seq = getSeqNode(xmlDoc, "urn:scrapbook:root");
    function show_seq(seq, level, $container){
        var about = seq.getAttribute("RDF:about")
        if(about){
            var desc_node = getDescNode(xmlDoc, about);
            if(desc_node){
                var this_id = desc_node.getAttribute("NS1:id");
                var $item = $("<div><div class='item folder' id='{id}'>{title}</div></div>".fillData({
                    "title": desc_node.getAttribute("NS1:title"),
                    "id": this_id,
                })).appendTo($container).css("margin-left",  (level - 1) * 20 + "px")
                $item.find(".item").click(function(){
                    if($(this).hasClass("expended")){
                        $(this).removeClass("expended");
                    }else{
                        $(this).addClass("expended");
                    }
                    $(this).nextAll("div").toggle();
                });
                if(level>1)
                    $item.hide();
                $container = $item;
            }else {
                // this is root
            }
        }
        function show_link(desc_node){
            if(desc_node){
                var id = desc_node.getAttribute("NS1:id");
                var type = desc_node.getAttribute("NS1:type") || "local";
                var source = desc_node.getAttribute("NS1:source");
                var $con = $("<div></div>").appendTo($container);
                var $item = $("<div class='item {class}'>{title}</div>".fillData(
                    {"class": type,
                     "title": desc_node.getAttribute("NS1:title")})
                             ).appendTo($con).css("margin-left", (level) * 20 + "px")
                
                if(level > 0) $con.hide();
                
                $item.click(function(){
                    if(type == "local"){
                        window.open("data/"+id+"/index.html", "_blank")
                    }else if(type == "bookmark"){
                        window.open(source, "_blank");
                    }
                });
                if(type == "local"){
                    var $origin = $("<div class='item {class} origin'>origin</div>".fillData(
                        {"class": type})).appendTo($con);
                    $origin.click(function(){
                        window.open(source, "_blank");
                    });
                }
            }
        }
        function show_separator(desc_node){
            $("<hr/>").appendTo($(".box"))
        }
        for(var j=0; j<seq.children.length; j++){
            var child =  seq.children[j];
            var seq_node = getSeqNode(xmlDoc, child.getAttribute("RDF:resource"));
            var separator = getDecSeparator(xmlDoc, child.getAttribute("RDF:resource"));
            if(seq_node){ // folder
                var id = seq_node.getAttribute("RDF:about").replace("urn:scrapbook:item", "");
                show_seq(seq_node, level + 1, $container);
            }else if(separator){
                show_separator(separator)
            }else{ // child
                show_link(getDescNode(xmlDoc, child.getAttribute("RDF:resource")))
            }
        }
    }
    show_seq(root_seq, 0, $(".box"));
}
xmlhttp.open("GET", "scrapbook.rdf", false);
xmlhttp.send();
