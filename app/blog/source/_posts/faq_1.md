title: Ежедневные открытия
subtitle: часто задаваемые вопросы, приводящие к провалам
date: 2013-11-03
author: Виталий Аминев
gravatarMail: v@aminev.me
tags: [AngularJS]
---

### Что такое области видимости в Angular.js?

`Scope`, оно же `область видимости` - это объект, ссылающийся на своеобразную модель приложения. Это контекст, в котором
исполняются и обрабатываются выражения. 

Области видимости представляют из себя иерархическую структуру, которая копирует DOM вашего приложения. Области видимости могут наблюдать за изменениями значений выражений, исполняющихся в их контексте и
способны распространять события.

По сути `scope` - это сердце вашего приложения, в котором и происходит вся "магия".

### Как писать интеграционные тесты с использованием `$httpBackend` из набора Angular-mocks

Как обычно достаточно пространное описание в документации не дает четкого представления о том, как же все-таки делать
адекватные заглушки для ответа. 

Приводим ответ в виде примера:

```javascript
var backendService = angular.module("backendService", ["nameOfYourApp", "ngMockE2E"]);

backendService.run([
  "$httpBackend",
  function ($httpBackend) {
    
    $httpBackend.when("GET", /^\/uri\/to\/match$/).respond(function(method, url, params){
      // здесь самое интересное - формат ответа. Он обязательно должен быть в виде массива
      // 1 элемент - код ответа, Number
      // 2 элемент - строка с ответом, String
      // 3 элемент - дополнительные Headers, Object
      return [ 200, JSON.stringify({success:true, hello: "World!"}), {} ];
    });
  }
]);
```