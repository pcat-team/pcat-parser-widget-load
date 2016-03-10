var path = require("path");

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

            var propsData = getPropsObj(props);

            var template = getwidgetTempate(propsData, file);

            var tagID = tagName + "_" + (count++);

            // tag = tag.replace(/>.*<\//, ">" + template + "</");
            tag = '<' + tagID + '  ' + props.trim() + '>' + template + '</' + tagID + '>'

            return tag;


        });


    }

    return content;
}




//获取组件模板
function getwidgetTempate(props, file) {

    var widgetName = props.name,
        widgetVersion = props.version;

    if (!widgetName) {
        // fis.log.error("未指定组件widgetName");
        fis.log.error('组件 [%s]加载失败,请指定组件name', tagName)
    }

    var template = "";

    var ids = widgetName.split(":").reverse();


    //子系统，没指定为当前子系统
    var namespace = ids[1] || project;

    var latestVersion = getProjectLatestVersion(namespace);

    var widgetVersion = widgetVersion || latestVersion;

    //组件名
    var name = ids[0];
    var widgetDir = getWidgetDir(tagName, name);

    var ret = compareVersion(widgetVersion, latestVersion);


    // 大于当前版本
    if (ret == 3) {

        fis.log.error(' [%s]组件使用的版本[%s]不存在，当前最新版本为[%s]', widgetName, widgetVersion, latestVersion);
    }

    // 小于当前版本
    if (ret == 1) {
        fis.log.warn('组件 [%s]使用旧版本[%s]，当前最新版本为[%s]，请更新或新建组件！[%s]', widgetName, widgetVersion, latestVersion, file.origin);

    }

    // 等于当前版本 && 当前项目
    if (ret == 2 && namespace == project) {


        if (!fis.util.exists(widgetDir)) {
            fis.log.error('组件[%s]不存在', widgetName)
        }

        // 通过该方式进行资源定位，绝对路径
        template = '<link rel="import" href="/' + widgetDir + '?__inline">';

    } else {


        // 解析跨系统资源依赖表路径
        var mapPath = path.resolve(mapOutputPath, namespace, widgetVersion, "map.json");

        if (!fis.util.exists(mapPath)) {
            fis.log.error(' 本地未找到该组件[%s]版本[%s]，可通过CI服务器编译测试查看效果！', widgetName, widgetVersion)
        }

        // 获取跨系统获取资源依赖表
        var map = require(mapPath);

        var id = namespace + ":" + widgetDir;

        // 添加依赖
        file.addRequire(id);

        var uri = map.res[id].uri;


        // 读取跨系统模板
        var templatePath = path.resolve(templateOutputPath, "./" + uri);

        if (!fis.util.exists(templatePath)) {
            fis.log.error('unable to load template [%s]', templatePath)
        }


        template = fis.util.read(templatePath);
    }



    return template;

}

/**
 * 获取模板路径
 * @param  {String} tagName    组件标签名，默认为widget
 * @param  {String} widgetName 组件明
 * @return {String}            组件路径
 */
function getWidgetDir(tagName, widgetName) {
    return tagName + '/' + widgetName + '/' + widgetName + '.html';
}


/**
 * 对比两个版本大小
 * @param  {String} v1 版本1
 * @param  {String} v2 版本2
 * @return {Number}    1：小于，2：等于，3：大于
 */
function compareVersion(v1, v2) {
    var v1Arr = v1.split("."),

        v2Arr = v2.split(".");

    var ret = 2;

    for (var i = 0; i < 3; i++) {
        if (v1Arr[i] > v2Arr[i]) {
            ret = 3;
            break;
        } else if (v1Arr[i] < v2Arr[i]) {
            ret = 1;
            break;
        }
    }

    return ret;

}


/**
 * 获取指定项目的最新版本
 * @param  {String} project 项目名称
 */
function getProjectLatestVersion(namespace) {

    var packagePath = path.resolve(projectPath, "package.json");

    if (namespace != project) {

        packagePath = path.resolve(packageOutputPath, namespace, "package.json");

    }


    if (!fis.util.exists(packagePath)) {
        fis.log.error('package.json加载失败[%s]，尝试先编译[%s]项目！', packagePath, namespace);
    }

    var version = require(packagePath).version;

    return version;
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
