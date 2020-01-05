###一、Git-Hook
Git 能在特定的重要动作发生时触发自定义脚本。 有两组这样的钩子：客户端的和服务器端的。 客户端钩子由诸如提交和合并这样的操作所调用，而服务器端钩子作用于诸如接收被推送的提交这样的联网操作。
   工作流相关的钩子：
* `pre-commit`钩子在键入提交信息前运行。 它用于检查即将提交的快照，例如，检查是否有所遗漏，确保测试运行，以及核查代码。 如果该钩子以非零值退出，Git 将放弃此次提交，不过你可以用`git commit --no-verify`来绕过这个环节。 你可以利用该钩子，来检查代码风格是否一致（运行类似`lint`的程序）、尾随空白字符是否存在（自带的钩子就是这么做的），或新方法的文档是否适当。


* `prepare-commit-msg`钩子在启动提交信息编辑器之前，默认信息被创建之后运行。 它允许你编辑提交者所看到的默认信息。 该钩子接收一些选项：存有当前提交信息的文件的路径、提交类型和修补提交的提交的 SHA-1 校验。 

* `commit-msg`钩子接收一个参数，此参数即上文提到的，存有当前提交信息的临时文件的路径。 如果该钩子脚本以非零值退出，Git 将放弃提交，因此，可以用来在提交通过前验证项目状态或提交信息。 在本章的最后一节，我们将展示如何使用该钩子来核对提交信息是否遵循指定的模板。

* `post-commit`钩子在整个提交过程完成后运行。 它不接收任何参数 该钩子一般用于通知之类的事情。
下面利用`pre-commit`钩子来运行tslint程序。

###二、Husky
[husky](https://www.npmjs.com/package/husky)是一个Git Hook工具，可以让我们更方便地使用Git的钩子，并避免一些错误代码或者一些不合规范的代码提交和推送。
###三、安装和配置
安装husky、tslint
```
npm install husky tslint --save-dev
```
新建`tslint.json`文件至跟目录，文件内容如下：
```

{
  "defaultSeverity": "warning",
  "extends": "tslint:recommended",
  "rules": {
    "array-type": false,
    "arrow-parens": false,
    "deprecation": {
      "severity": "warning"
    },
    "component-class-suffix": true,
    "contextual-lifecycle": true,
    "directive-class-suffix": true,
    "directive-selector": [
      true,
      "attribute",
      "app",
      "camelCase"
    ],
    "component-selector": [
      true,
      "element",
      "app",
      "kebab-case"
    ],
    "interface-name": false,
    "max-classes-per-file": false,
    "max-line-length": [
      true,
      140
    ],
    "member-access": false,
    "member-ordering": [
      true,
      {
        "order": [
          "static-field",
          "instance-field",
          "static-method",
          "instance-method"
        ]
      }
    ],
    "no-consecutive-blank-lines": false,
    "no-console": [
      true,
      "debug",
      "info",
      "time",
      "timeEnd",
      "trace"
    ],
    "no-empty": false,
    "no-inferrable-types": [
      true,
      "ignore-params"
    ],
    "no-non-null-assertion": true,
    "no-redundant-jsdoc": true,
    "no-switch-case-fall-through": true,
    "no-var-requires": false,
    "object-literal-key-quotes": [
      true,
      "as-needed"
    ],
    "object-literal-sort-keys": false,
    "ordered-imports": false,
    "quotemark": [
      true,
      "single"
    ],
    "trailing-comma": false,
    "no-conflicting-lifecycle": true,
    "no-host-metadata-property": true,
    "no-input-rename": true,
    "no-inputs-metadata-property": true,
    "no-output-native": true,
    "no-output-on-prefix": true,
    "no-output-rename": true,
    "no-outputs-metadata-property": true,
    "template-banana-in-box": true,
    "template-no-negated-async": true,
    "use-lifecycle-interface": true,
    "use-pipe-transform-interface": true
  },
  "rulesDirectory": [
    "codelyzer"
  ]
}
```
新建`codelint.js`代码检测脚本至根目录，内容如下：
```
const { exec } = require('child_process');

/**
 * @param  {type}  需要的文件类型：['ts', 'css']
 * @return {files} 返回符合条件的文件列表 ['a.ts b.ts c.ts', 'a.css, b.css']
 * @Description: 获取暂存区待commit的文件列表
 */
const getChangedFiles = (tyes = []) => {
    return new Promise((resolve, reject) => {
        exec('git diff --cached --name-only', (err, stdout) => {
            if (err) {
                reject('获取待commit文件列表失败，错误：' + (err.message || err));
            } else {
                const files = tyes.reduce((result, type) => {
                    const filterFiles = stdout.split('\n').filter(f => f.indexOf('.' + type) > -1).join(' ');
                    result.push(filterFiles);
                    return result;
                }, [])

                resolve(files);
            }
        });
    });
}

/**
 * @param   {files}   待检测的文件: 'a.ts b.ts'
 * @return  {stdout}  检测结果
 * @Description: 执行代码检测
 */
const execLint = (type, files) => {
    return new Promise((resolve, reject) => {
        const cmdObj = {
            'ts': 'node ./node_modules/tslint/bin/tslint -c tslint.json',
            'css': 'node ./node_modules/stylelint/bin/stylelint'
        };

        const cmd = cmdObj[type];
        exec(`${cmd} ${files}`, (err, stdout) => {
            if (err) {
                return reject(err);
            }
            stdout ? reject(stdout) : resolve(null);
        });
    });
}

const start = async () => {
    try {
        const [ tsFiles ] = await getChangedFiles(['ts']);
        if (tsFiles) {
            const execResult = await execLint('ts', tsFiles);
            if (execResult) {
                throw ('代码存在以下问题：\n' + execResult);
            }
        }
    } catch (error) {
        console.log(error);
        // 退出进程，不再commit文件
        process.exit(1);
    }
}

start();
```
修改package.json，添加以下代码：
```
"husky": {
    "hooks": {
      "pre-commit": "node ./codelint.js"
    }
}
```
四、总结
按照以上安装和配置，每次commit的时候就会执行codelint.js的代码，这样可以阻止错误代码和不符合规范代码的提交，如果我们要检测css代码和html代码，可以安装htmllint、stylelint再添加相应的配置文件来实现。