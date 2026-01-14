/**
 * @packageDocumentation
 * @module game
 */

import { Protobuf } from '../libs/serialize/protobuf';

declare type Constructor<T = unknown> = new (...args: any[]) => T;

function makeSmartClassDecorator (
    decorate: <T>(constructor: Constructor<T>, name : string,abbr ?:string) => ReturnType<ClassDecorator>,
): ((name : string) => ClassDecorator) & ((name : string,abbr :string) => ClassDecorator) {
    return proxyFn;

    function proxyFn(name : string): ClassDecorator;
    function proxyFn(name : string,abbr:string): ClassDecorator;
    function proxyFn (name : string,abbr ?:string): ReturnType<ClassDecorator> {
        if (abbr === undefined) {
            return function <T> (constructor: Constructor<T>) {
                return decorate(constructor, name);
            };
        } else {
            return function <T> (constructor: Constructor<T>) {
                return decorate(constructor, name,abbr);
            };
        }
    }
}

/**
  * @zh
  * 注册protobuf结构体，可以指定游戏abbr
*/

var delayRefresh = false

export const pbdecl:((name : string,abbr ?:string ) => ClassDecorator) = makeSmartClassDecorator((constructor, name,abbr?) => {
    if (!Protobuf.Declare(name,constructor)) {
        // 类型信息不充分，放入等待列表
        Protobuf.AddPendingDeclare(name,constructor)
    } else {
        if (!delayRefresh) {
            delayRefresh = true
            const p = new Promise<void>((resolve) => {
                resolve()    
            });
              
            p.then(() => {
                delayRefresh = false
                Protobuf.RefreshPendingDeclare()
            })
        }
    }

    constructor['__pbname'] = name;

    if (abbr) {

    }
})