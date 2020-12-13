class P{

    //定义Promise的三种状态
    static PENDING = 'pending';//准备

    static FULLFILLED = 'fullfilled';//成功

    static REJECT = 'reject';//拒绝

    constructor(executor){

        this.status = P.PENDING;  //Promise的初始状态为Pending

        this.data = undefined; //Promise的值

        this.callbacks = []; //保存回调函数
    
        /*
          执行器函数。
          实际上是一个立即执行函数，结构如下：
          ((resolve,reject) => {})(this.resolve,this.reject)
         */
        //注意要把this指向当前的this，否则会出错
        try {
        executor(this.resolve.bind(this),this.reject.bind(this));
        } catch (error) {
            //报错时，应该执行reject方法
            this.reject(error)
        }
    }

    //成功时执行的方法
    resolve(value){
        //当状态为'pending'时，才能改变状态
        if(this.status === P.PENDING){
            this.status = P.FULLFILLED;
            this.data = value;
            setTimeout(() => {
                this.callbacks.map(callback => {
                    callback.onFullfilled(value);
                })
            })
        }
    }

    //失败时执行的方法
    reject(reason){
        if(this.status === P.PENDING){
            this.status = P.REJECT;
            this.data = reason;
            setTimeout(() => {
            this.callbacks.map(callback => {
                callback.onRejected(reason);
            })
           })
        }
    }

    //then 方法
    then(onFullfilled,onRejected){
        
        //因为Promise调用then方法时可以不传参数，或者传null，
        //所以当参数不是函数时，赋值为函数，避免报错
        //返回data,实现then的穿透
        if(typeof onFullfilled != 'function'){
            onFullfilled = () => this.data
        }

        if(typeof onRejected != 'function'){
            onRejected = () => this.data
        }

        //实现then的链式调用
        let promise = new P((resolve,reject) => {
            //准备状态时要保存回调函数
        if(this.status === P.PENDING){
            this.callbacks.push({
                onFullfilled: value => {
                    this.parse(promise,onFullfilled(value),resolve,reject);
                },
                onRejected: value => {
                    this.parse(promise,onRejected(value),resolve,reject);
                }
            })
        }

        if(this.status === P.FULLFILLED){
            //setTimeout定时器会产生宏任务，不是微任务
            //then方法执行应该放在任务队列里
            setTimeout(() => {
              this.parse(promise,onFullfilled(this.data),resolve,reject);
            })
        }

        //then方法执行应该放在任务队列里
        if(this.status === P.REJECT){
            setTimeout(() => {
                this.parse(promise,onRejected(this.data),resolve,reject);
             })
        }
        })

        return promise;
    }

    parse(promise,result,resolve,reject){
        //不能在当前的promise处理中返回本身
        if(promise == result){
            throw new TypeError('Chaining cycle detected for promise');
        }
        try {
            //如果返回的结果是Promise对象
            if(result instanceof P){
                result.then(resolve,reject);
                // result.then(
                // value => {
                //     resolve(value);
                // },
                // reason => {
                //     reject(reason);
                // })
            }else{
              resolve(result);
            }
           } catch (error) {
            reject(error);   
           } 
    }

    static resolve(value){
        return new P((resolve,reject) => {
            if(value instanceof P){
                value.then(resolve,reject);
            }else{
                resolve(value);
            }
        })
    }

    static reject(value){
        return new P((resolve,reject) => {
            reject(value);
        })
    }

    static all(promises){
        //保存每次的promise
        const values = [];
        return new P((resolve,reject) => {
            promises.forEach(promise => {
                promise.then(
                    value => {
                        values.push(value);
                        //所有的promise都执行完后
                        if(values.length === promises.length){
                            resolve(values);
                        }
                    },
                    reason => {
                        reject(reason);
                    }
                )
            });
        })
    }

    static race(promises){
        return new P((resolve,reject) => {
            promises.map(promise => {
                promise.then(
                    value => {
                        resolve(value);
                    },
                    reason => {
                        reject(reason);
                    }
                )
            })
        })
    }
}