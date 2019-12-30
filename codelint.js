/*
 * @Autor: Wy
 * @Date: 2019-12-30 22:33:19
 * @LastEditors  : Wy
 * @LastEditTime : 2019-12-30 23:51:29
 * @Description: husky搭配pre-commit钩子进行代码检测
 */
const { exec } = require('child_process');

/**
 * @param  {type}  需要的文件类型：['ts', 'css']
 * @return {files} 返回符合条件的文件列表 ['a.ts b.ts c.ts', 'a.css, b.css']
 * @Description: 获取暂存区待commit的文件列表
 * @Autor: Wy
 * @Date: 2019-12-30 22:05:25
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
 * @Autor: Wy
 * @Date: 2019-12-30 22:08:50
 */
const execLint = (type, files) => {
    return new Promise((resolve, reject) => {
        const cmdObj = {
            'ts': 'node ./node_modules/tslint/bin/tslint -c ./tslint.json',
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
console.log(111)
// start();