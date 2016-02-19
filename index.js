var path = require("path");

var projectPath = fis.project.getProjectPath();

// 获取当前项目名称
var project,

    tagName,

     mapOutputPath,

    templateOutputPath,

    count = 0;

module.exports = function(content, file, conf) {

    // tagName = conf.tagName || "widget";
    
    project = conf.project;

    tagName = conf.tagName;

    mapOutputPath  = conf.mapOutputPath;

    templateOutputPath = conf.templateOutputPath;


    //匹配组件标签如<widget id=""></widget>
    // var regString = "<(" + tagName + ")([^>]+)*>(.*)<\\/\\1>";
    var regString = "<(" + tagName + ")([^>]+)*>(.*?)<\\/\\1>";

    var pattern = new RegExp(regString, "gim");

    // var widgets = content.replace(/<\/widget>/g,"</widget>\n").match(pattern);
    var widgets = content.match(pattern);

    if (widgets) {

        content = content.replace(pattern, function(tag, name,props) {

            var propsObj = getPropsObj(props);

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
        // fis.log.error("未指定组件id");
        fis.log.error('组件 [%s]加载失败,请指定组件id', tagName)
    }

    var template = "";

    var ids = id.split(":").reverse();


    //子系统，没指定为当前子系统
    var namespace = ids[1] || project;

    //组件名
    var name = ids[0];

    var widgetTemplate = path.join(tagName,name,name+".html");


    //如果是本系统或者没指定子系统
    if (namespace == project) {

        if(!fis.util.exists(widgetTemplate)){
            fis.log.error('组件[%s]不存在', id)
        }

        // 通过该方式进行资源定位，绝对路径
        template = '<link rel="import" href="/' + widgetTemplate + '?__inline">';


        //跨系统
    } else {
        var version = getProjectVersion(namespace);


         // 解析跨系统资源依赖表路径
        var mapPath = path.resolve(mapOutputPath,namespace,version,"map.json");


        if(!fis.util.exists(mapPath)){
            fis.log.error('unable to load map.json [%s]', mapPath)
        }

        // 获取跨系统获取资源依赖表
        var map = require(mapPath);

        var id = namespace + ":" + widgetTemplate;

        // 添加依赖
        file.addRequire(id);

        var uri = map.res[id].uri;


        // 读取跨系统模板
        var templatePath = path.resolve(templateOutputPath,"./"+uri);

         if(!fis.util.exists(templatePath)){
            fis.log.error('unable to load template [%s]', templatePath)
        }


        template = fis.util.read(templatePath);
    }


    return template;

}

// 获取指定项目的版本
    function getProjectVersion(project){
        
        var packagePath = path.resolve(projectPath,"..",project,"package.json");

        if(!fis.util.exists(packagePath)){
            fis.log.error('unable to load package.json [%s]', packagePath)
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
