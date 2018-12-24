var path = require("path");
var fs = require("fs");
var projectPath = fis.project.getProjectPath();


// 获取当前项目名称
var project,

    tagName,

    mapOutputPath,

    templateOutputPath,

    packageOutputPath,

    count = 0;

module.exports = function(content, file, conf) {

    // tagName = conf.tagName || "widget";

    project = conf.project;

    tagName = conf.tagName;

    mapOutputPath = conf.mapOutputPath;

    templateOutputPath = conf.templateOutputPath;

    packageOutputPath = conf.packageOutputPath;



    //匹配组件标签如<widget id=""></widget>
    // var regString = "<(" + tagName + ")([^>]+)*>(.*)<\\/\\1>";
    var regString = "<(" + tagName + ")([^>]+)*>(.*?)<\\/\\1>";

    var pattern = new RegExp(regString, "gim");

    // var widgets = content.replace(/<\/widget>/g,"</widget>\n").match(pattern);
    var widgets = content.match(pattern);

    if (widgets) {

        content = content.replace(pattern, function(tag, name, props) {

            var propsObj = getPropsObj(props);

            var widgetName = propsObj["name"];

            var template = getWidgetTemplate(propsObj, file);

            var tagID = tagName + "_" + (count++);

            // tag = tag.replace(/>.*<\//, ">" + template + "</");
            tag = '<!--' + widgetName + '-->' + '<' + tagID + '  ' + props.trim() + '>' + template + '</' + tagID + '>' + '<!--/' + widgetName + '-->'

            return tag;


        });


    }

    return content;
}




//获取组件模板
function getWidgetTemplate(props, file) {

    // 相当于注释掉，开发的时候，把其他组件先屏蔽掉，方便开发
    const hidden = props['hidden'];

    if(hidden) return '';


    var id = props["name"];



    if (!id) {
        // fis.log.error("未指定组件id");
        fis.log.error('[%s]未指定组件名"name"', tagName)
    }

    var version = props["version"];

    if (!version) {
        fis.log.error('组件 [%s]未指定版本"version"', id)
    }



    var template = "";

    var ids = id.split(":").reverse();


    //子系统，没指定为当前子系统
    var namespace = ids[1] || project;



    //组件名
    var name = ids[0];

    var widgetTemplate = tagName + '/' + name + '/' + version + '/' + name + '.html';


    //如果是本系统或者没指定子系统
    if (namespace == project) {

        if (!fis.util.exists(widgetTemplate)) {
            fis.log.error('组件[%s]版本[%s]不存在', id, version)
        }
        // 用于公共头尾开发
        // 因为公共头尾使用的是ssi引入
        // 开发的时候看不到效果
        // 所以设置开发模式，引入tpl模板
        if(props["dev"] == "true" || props["ext"] == ".tpl"){
            widgetTemplate = tagName + '/' + name + '/' + version + '/' + name + '.tpl';
        }

        if (props["_fileType"] == "js") {

            // template = "'+__inline('/"+widgetTemplate+"')+'";
            template = '"+__inline("' + widgetTemplate + '")+"';
        } else {
            // 通过该方式进行资源定位，绝对路径
            template = '<link rel="import" href="/' + widgetTemplate + '?__inline">';

        }

        // 保存当前系统被引用的组件（_wlist页面除外）
        var iswlist = props["_wlist"];

        if (!iswlist) {
            var widgetLoad = fis.get("__WIDGETLOADEDLISTS__") || {};
            if (!widgetLoad[name]) widgetLoad[name] = {};
            widgetLoad[name][version] = true;
            fis.set('__WIDGETLOADEDLISTS__', widgetLoad);

        }


        //跨系统
    } else {
        // var version = getProjectVersion(namespace);


        // 解析跨系统资源依赖表路径
        var mapPath = path.resolve(mapOutputPath, namespace, "map.json");


        if (!fis.util.exists(mapPath)) {
            fis.log.error('unable to load map.json [%s]', mapPath)
        }

        // 获取跨系统获取资源依赖表
        var map = require(mapPath);

        var tplDir = namespace + ":" + widgetTemplate;

        // 添加依赖
        file.addRequire(tplDir);

        if (!map.res[tplDir]) {
            fis.log.error('组件[%s]不存在', id)
        }

        var uri = map.res[tplDir].uri;


        // 读取跨系统模板
        var templatePath = path.resolve(templateOutputPath, "./" + uri);

        if (!fis.util.exists(templatePath)) {
            fis.log.error('unable to load template [%s]', templatePath)
        }


        template = fis.util.read(templatePath);
    }


    return template;

}



// 获取指定项目的版本
function getProjectVersion(project) {

    var packagePath = path.resolve(packageOutputPath, project, "package.json");

    if (!fis.util.exists(packagePath)) {
        fis.log.error('package.json加载失败[%s]，尝试先编译[%s]项目！', packagePath, project);
    }

    var version = require(packagePath).version;

    return version;
}



//匹配标签的属性和值 k=v
var prostr = /(\S+)\s*\=\s*(("[^"]*")|('[^']*'))/gi;

// 获取属性对象
function getPropsObj(props) {
    var obj = {};

    if (props) {
        var propsArr = props.trim().match(prostr);


        obj = require("querystring").parse(propsArr.join("&").replace(/["']/g, ""));

    }

    return obj;
}
