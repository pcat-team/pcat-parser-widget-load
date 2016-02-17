var projectPath = fis.project.getProjectPath();

var media = fis.project.currentMedia() || "dev";

// 获取当前项目名称
var project = require(projectPath + '/package.json').name;

var tagName, outputPath;

var count = 0;

module.exports = function(content, file, conf) {

    tagName = conf.tagName || "widget";

    outputPath = conf.outputPath || "../../outputPath";

    //匹配组件标签<w-widget></w-widget>
    // var regString = "<(" + tagName + ")([^>]+)*>(.*)<\\/\\1>";
    var regString = "<(" + tagName + ")([^>]+)*>(.*?)<\\/\\1>";

    var pattern = new RegExp(regString, "gim");

    // var widgets = content.replace(/<\/widget>/g,"</widget>\n").match(pattern);
    var widgets = content.match(pattern);

    if (widgets) {

        content = content.replace(pattern, function(tag, name,props) {

            var propsObj = getPropsObj(props);

            // console.log(props)
            // console.log(propsObj)

            var template = getWidgetTemplate(propsObj["id"], file);

            var tagID = tagName+"_"+(count++);

            // tag = tag.replace(/>.*<\//, ">" + template + "</");
             tag = '<'+tagID+'  ' + props.trim() + '>'+template+'</'+tagID+'>'

            return tag;


        });


    }

    return content;
}




//获取组件模板
function getWidgetTemplate(id, file) {

    if (!id) {
        fis.log.error("未指定组件id");
    }

    var template = "";

    var ids = id.split(":").reverse();


    //子系统，没指定为当前子系统
    var namespace = ids[1] || project;

    //组件名
    var name = ids[0];

    var widgetPath = tagName + '/' + name + '/' + name + '.html';


    //如果是本系统或者没指定子系统
    if (namespace == project) {

        // 通过该方式进行资源定位，绝对路径
        template = '<link rel="import" href="/' + widgetPath + '?__inline">';


        //跨系统
    } else {
        var version = require(projectPath + "/../" + namespace + "/package.json").version;


        // 跨系统获取资源依赖表
        var mapPath = projectPath + "/" + outputPath + "/" + media + "/map/" + namespace + "/" + version + "/map.json";

        var map = require(mapPath);

        var uri = map.res[namespace + ":" + widgetPath].uri;

        file.addRequire(namespace + ":" + widgetPath);

        template = fis.util.read(outputPath + "/" + media + "/template" + uri);
    }


    return template;

}



//匹配标签的属性和值 k=v
var prostr = /(\S+)\s*\=\s*("[^"]*")|('[^']*')/gi;

// 获取属性对象
function getPropsObj(props) {
    var obj = {};

    if (props) {
        var propsArr = props.trim().match(prostr);


        obj = require("querystring").parse(propsArr.join("&").replace(/["']/g, ""));

    }

    return obj;
}
