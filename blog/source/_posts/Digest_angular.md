title: Ускоряем $digest цикл в AngularJS
date: 2014-03-28
author: Анна Аминева
gravatarMail: annafedotovaa@gmail.com
tags: [Angular.JS, Javascript]
---
![Иллюстрация блокнота](/blog/images/digest.jpg)

Магическая связь HTML/JS в AngularJS зависит от очень эффективного dirty checking.  Тем не менее, когда вы все-таки достигаете его лимита, ваше приложение обречено быть медленным. Но когда все остальные решения провалились, мы все-таки можем найти решение.
<!-- more -->

Во-первых, введение для незнающих, как происходит dirty-checking в AngularJS. 
Когда вы добавляете обработчик `ng-click`, Ангуляр вызовет вашу функцию и будет спокойно ждать пока вернется результат ее выполнения. После этого, он должен угадать какие изменения произошли с вашими областями видимости. Области видимости – это обычные JS объекты: ничего особенного не происходит когда вы изменяете их и у Angular просто нет простого решения для отслеживания ваших изменений.

Всякий раз когда вы используете связь `{ { model.value } }`, AngularJS превращает ее в функцию (используя модуль `$parse` ) и добавляет его в приватный список: `scope.$$watchers` (`scope.$watch` делает тоже самое). Чтобы обнаружить изменения, у Angular нет иного выхода, кроме как вызвать все функции из списка `$$watchers`, чтобы проверить изменились ли результаты их выполнения. Часто существует как минимум 1 `watcher` на каждый HTML element, а всего в обычном приложении их будет больше тысячи.


В любом случае, просто знайте, что каждый раз как что-то происходит в приложении, Angular вызовет все ваши `$$watchers`: сотни, если не тысячи функций JS (большая часть из них генерируется на лету). И вместе с ростом вашего приложения, этот процесс будет занимать все больше и больше времени, и, в итоге, может вылиться в заметные, позорные для разработчика тормоза.


Как бы это не было удивительным, проблем с этим обычно нет, даже несмотря на предупреждение в документации не отображать более 2000 элементов одновременно. Отметим, что AngularJS 2.0 скорее всего принесет серьезные улучшения в производительности.
Мне не повезло, я пишу на старом 11' MacBook Air, которой уже показывает свой возраст и я сталкиваюсь с ограничениями ангуляра довольно часто.

## Проблема длинного списка

Предположим у вас есть длинная таблица, скажем из нескольких тысяч строк. Для того, чтобы оставаться внутри лимита в 2000 элементов, вы можете попытаться добавить `onscroll` событие к элементу, определять какие клетки видимые, рендерить их, но прятать другие. К сожалению,  это сделает ваше приложение очень медленным (~5fps). Причина заключается в том, что событие прокрутки срабатывает слишком часто: возможно в каждом доступном кадре. Если ваш `$digest` цикл завершается, скажем, за 100 мс, это будет приемлемой скоростью реакции на клик, но много выше 16 ms, требуемых для 60 fps.

Существует несколько очевидных оптимизаций типа [debounce](http://underscorejs.org/#debounce) события, но они будут иметь ограниченный эффект. Я выяснил, что чем больше вы дебаунсите (чем больше вы ждете до выполнения 2х последовательных `$digest` циклов), тем больше видимых клеток вам нужно (чтобы у пользователя не было времени для скролла за границу видимых клеток). В общем, вы должны найти баланс между низким количеством кадров в секунду (короткий промежуток для дебаунса), зависаниями (большое время дебаунса) или просто глючным приложением.
Вы так же можете попробовать ограничить количество `$$watchers` с [angular-once](https://github.com/tadeuszwojcik/angular-once), но по сути он вообще отключит AngularJS и вы, в общем-то, можете работать с jQuery ровно с таким же успехом.
Моя уловка: выборочно отключать `$$watchers`
Предположим у нас есть эта разметка:

```javascript
<ul ng-controller="listCtrl">   <li ng-repeat="item in visibleList">{ {lots of bindings } }</li> </ul> 
```

And this code:

```javascript
app.controller('listCtrl', function ($scope, $element) {
  $element.on('scroll', function (e) {
    $scope.visibleList = getVisibleElements(e);
    $scope.$digest();
  });
});
```

Во время `$digest` цикла вы заинтересованы только в изменениях `visibleList`, но не в изменениях индивидуальных элементов. Тем не менее, Angular будет упорно допрашивать каждого вотчера об изменениях.
Так вот, я написал очень простую директиву:

```javascript
aapp.directive('faSuspendable', function () {
  return {
    link: function (scope) {
      // Heads up: this might break is suspend/resume called out of order
      // or if watchers are added while suspended
      var watchers;

      scope.$on('suspend', function () {
        watchers = scope.$$watchers;
        scope.$$watchers = [];
      });

      scope.$on('resume', function () {
        if (watchers)
          scope.$$watchers = watchers;

        // discard our copy of the watchers
        watchers = void 0;
      });
    }
  };
});
;
``` 

И изменил свой код на:

```javascript
<ul ng-controller="listCtrl">
  <li fa-suspendable ng-repeat="item in visibleList">{ { lots of bindings } }</li>
</ul>

app.controller('listCtrl', function ($scope, $element) {
  $element.on('scroll', function (e) {
    $scope.visibleList = getVisibleElements(e);

    $scope.$broadcast('suspend');
    $scope.$digest();
    $scope.$broadcast('resume');
  });
});
```
 
 
Все что он делает – это временно скрывает вотчеров индивидуальных элементов. Вместо того, чтобы израсходовать сотни вотчерсов, все что сделает Angular – это проверяет если элементы были добавлены или удалены из видимого списка. Приложение мгновенно вернулось к 60fps во время прокрутки!
А самая классная вещь в том, что все остальные события до сих пор работают как обычно. Теперь мы можем взять пирожок с полки и съесть его:  

* Наблюдать за событиями прокрутки, прятать все невидимые элементы и сильно уменьшать число вотчеров;
* Получать контролируемые `$digest` циклы для всех остальных событий
