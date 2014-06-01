var minA = {
  defaults: {
    tracking_id: "hail2unet-22"
  },

  systemMessages: {
    "defaultMessage": "初期化完了",
    "defaultResult":  "フォームにキーワードを入力してGoボタンを押して下さい。",
    "searching":      "検索中……",
    "resultSummary":  "<a href=\"http://www.amazon.co.jp/\">Amazon.co.jp</a> から <em><%QUERY%></em> を検索した結果 約 <em><%TOTAL_RESULTS%></em> 件中 <em><%RANGE%></em> 件を表示中", 
    "noPrice":        "価格情報がありません",
    "prevLink":       "&#171; 戻る",
    "nextLink":       "次へ &#187;"
  },

  categoryLabels: {
    "Apparel":           "アパレル&ファッション雑貨",
    "Baby Product":      "ベビー&マタニティ",
    "Book":              "本・漫画・雑誌",
    "CE":                "家電&カメラ",
    "DVD":               "DVD",
    "Grocery":           "食品&飲料",
    "Health and Beauty": "ヘルス&ビューティー",
    "Kitchen":           "ホーム&キッチン",
    "Music":             "ミュージック",
    "Office Product":    "文房具・オフィス用品",
    "Shoes":             "シューズ",
    "Software":          "PCソフト",
    "Sports":            "スポーツ&アウトドア",
    "Toy":               "おもちゃ",
    "VHS":               "ビデオ",
    "Video Games":       "TVゲーム",
    "Watch":             "時計"
  },

  init: function (o) {
    minA.options = $.extend({}, minA.defaults, o);

    $(window).hashchange(minA.doItemSearch);

    $("#toggle-view-button").empty().append($("<img/>").attr({
      src:   "toggle-view-button.png",
      alt:   minA.systemMessages.toggleView,
      title: minA.systemMessages.toggleView
    }).click(function () {
      $("#toggle-view-button, #result").toggleClass("list").toggleClass("grid");
    }));


    $("#searchForm").submit(function () {
      var q = $("#q").val();

      if (q) {
        location.hash = "#q=" + encodeURIComponent(q);
      }

      return false;
    });

    minA.updateMessage(minA.systemMessages.defaultMessage);
    $("#result").empty().append($("<p/>").append(minA.systemMessages.defaultResult));

    if (location.hash) {
      minA.doItemSearch();
    }
  },

  doItemSearch: function () {
    var result = $("#result").empty();

    // location.hashが空だったらデフォルトの状態に戻して検索しない
    if (!location.hash) {
      minA.updateMessage(minA.systemMessages.defaultMessage);
      $("#result").html(minA.systemMessages.defaultResult);

      return;
    }

    var q = "";
    var p = 1;
    $.each(decodeURIComponent(location.hash.replace(/^#/, "")).split(";"), function () {
      if (this.match(/^q=(.*)$/)) {
        q = RegExp.$1;
      } else if (this.match(/^p=([1-9]\d*)$/)) {
        p = RegExp.$1;
      }
    });
    $("#q").val(q);

    minA.updateMessage(minA.systemMessages.searching);

    var url = "http://rpaproxy.tdiary.org/rpaproxy/jp/?" + $.param({
      Service:        "AWSECommerceService",
      Operation:      "ItemSearch",
      SearchIndex:    "All",
      ResponseGroup:  "Small,Images,OfferSummary",
      Version:        "2011-08-01",
      AWSAccessKeyId: "08PWFCAAQ5TZJT30SKG2",
      AssociateTag:   minA.options.tracking_id,
      Keywords:       q,
      ItemPage:       p
    });
    $.queryYQL("select * from xml where url='" + url + "'", function (data) {
      var res = data.query.results.ItemSearchResponse;

      if (res.Items.Request.Errors) {
        minA.updateMessage([
          res.Items.Request.Errors.Error.Code,
          res.Items.Request.Errors.Error.Message
        ].join(": "));
      } else {
        var page = Number(res.Items.Request.ItemSearchRequest.ItemPage);
        var items = $.makeArray(res.Items.Item); // 検索結果が1件の時も配列にしておく

        // 概要
        var from = ((page - 1) * 10 + 1);
        minA.updateMessage(minA.systemMessages.resultSummary.replace("<%QUERY%>", q).replace("<%TOTAL_RESULTS%>", res.Items.TotalResults).replace("<%RANGE%>", from + "-" + (from + items.length - 1)));

        // 検索結果のリスト
        $.each(items, function () {
          var item = $("<div/>").addClass("item");

          // 画像
          var image = $("<img/>").attr({
            alt: this.ItemAttributes.Title
          });

          if (this.MediumImage) {
            image.attr({
              src: this.MediumImage.URL,
              width: this.MediumImage.Width.content,
              height: this.MediumImage.Height.content
            });
          } else {
            image.attr({
              src: "http://g-ecx.images-amazon.com/images/G/09/x-site/icons/no-img-sm.gif",
              width: 60,
              height: 40
            });
          }

          $("<p/>").addClass("image").append($("<a/>").attr({
            href: this.DetailPageURL,
            title: this.ItemAttributes.Title
          }).append(image)).appendTo(item);

          // 価格
          var price = $("<p/>").addClass("price");

          if (this.OfferSummary.TotalNew > 0 && this.OfferSummary.LowestNewPrice) {
            price.append(this.OfferSummary.LowestNewPrice.FormattedPrice + " ～");
          } else {
            price.append(minA.systemMessages.noPrice);
          }

          price.appendTo(item);

          // タイトル
          var title = $("<h2/>").addClass("title").append($("<a/>").attr({
            href: this.DetailPageURL,
            title: this.ItemAttributes.Title
          }).append(this.ItemAttributes.Title)).appendTo(item);

          // その他情報
          var detail = $("<ul/>").addClass("detail");

          if (this.ItemAttributes.Actor) {
            $("<li/>").append(this.ItemAttributes.Actor.toString()).appendTo(detail);
          }

          if (this.ItemAttributes.Artist) {
            $("<li/>").append(this.ItemAttributes.Artist.toString()).appendTo(detail);
          }

          if (this.ItemAttributes.Author) {
            $("<li/>").append(this.ItemAttributes.Author.toString()).appendTo(detail);
          }

          if (this.ItemAttributes.Manufacturer) {
            $("<li/>").append(this.ItemAttributes.Manufacturer.toString()).appendTo(detail);
          }

          $("<li/>").append(minA.categoryLabels[this.ItemAttributes.ProductGroup.toString()]).appendTo(detail);
          $("<li/>").append(this.ASIN.toString()).appendTo(detail);
          detail.appendTo(item);

          // 区切り
          $("<hr/>").appendTo(item);

          item.appendTo(result);
        });

        // ページング
        var paging = $("<div/>").addClass("paging");
        var prev = $("<p/>").addClass("prev");
        var next = $("<p/>").addClass("next");

        if (page < 2) {
          prev.append(minA.systemMessages.prevLink);
        } else {
          var urlPrev = (page === 2) ? "#q=" + encodeURIComponent(q) : "#q=" + encodeURIComponent(q) + ";p=" + (page - 1);
          prev.append($("<a/>").attr({
            href: urlPrev
          }).click(function () {
            doItemSearch(q, pagePrev);
            location.hash = urlPrev;
          }).append(minA.systemMessages.prevLink));
        }

        if (page > 4 || page >= res.Items.TotalPages) {
          next.append(minA.systemMessages.nextLink);
        } else {
          var urlNext = "#q=" + encodeURIComponent(q) + ";p=" + (page + 1);
          next.append($("<a/>").attr({
            href: urlNext
          }).click(function () {
            location.hash = urlNext;
          }).append(minA.systemMessages.nextLink));
        }

        paging.append(prev).append(next).appendTo(result);
      }
    });
  },

  updateMessage: function (s) {
    $("#message").empty().append($("<p/>").append(s));
  }
};
