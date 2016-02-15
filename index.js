var projectPath = fis.project.getProjectPath();

// 获取当前项目名称
var currentProject = require(projectPath+'/package.json').name;

// 输出路径
var outputPath = "../../_output";

//匹配组件标签<w-widget></w-widget>
var regString = "<widget([^>]+)*>(.*)<\\/widget>";

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

//获取组件模板
function getWidgetTemplate(id,file) {
    if (!id) {
        fis.log.error("未指定组件id");
    }

    var template = "";

    var ret = id.split(":").reverse();


    //子系统，没指定为当前子系统
    var project = ret[1] || currentProject;

    //组件名
    var name = ret[0];

    var widgetPath = 'widget/' + name + '/' + name + '.html';


    //如果是本系统或者没指定子系统
    if (project == currentProject) {

        // 通过该方式进行资源定位，绝对路径
        template = '<link rel="import" href="/' + widgetPath + '?__inline">';


        //跨系统
    } else {
        var version = require(projectPath+"/../"+project+"/package.json").version;
        var media = fis.project.currentMedia() || "dev";

        // 跨系统获取资源依赖表
        var mapPath = projectPath+"/"+outputPath+"/" + media + "/map/" + project + "/" + version + "/map.json";


        var map = require(mapPath);

        var uri = map.res[project+":"+widgetPath].uri;



        file.addRequire(project+":"+widgetPath);
        // file.addAsyncRequire(project+":"+widgetPath);

        template = fis.util.read(outputPath+"/"+media+"/template" + uri);
    }


    return template;

}


//获取组件列表

function render(content, file) {

    var pattern = new RegExp(regString, "gim");

    var widgets = content.match(pattern);

    if (widgets) {
        content = content.replace(pattern, function(tag, props) {

            var propsObj = getPropsObj(props);

            var template = getWidgetTemplate(propsObj["id"],file);


            tag = '<widget ' + props.trim() + '>'+template+'</widget>';


            return tag;


        });


    }


    return content;
}

module.exports = function(content, file, settings) {

    var option = settings || {};



   var content = render(content, file);

   return content;
}