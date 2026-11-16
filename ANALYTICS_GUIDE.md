# アクセス解析と集計の見方

準備日：2026年11月16日（日本時間）

## 状態

GA4アカウント・プロパティ・ウェブストリームを作成し、サイトの測定IDを設定済み。2026年11月16日にユーザーから本番公開の指示を受領。計測は本番への反映後に開始し、受信状況は公開後に確認する。

| 設定 | 値 |
| --- | --- |
| アカウント / プロパティ名 | Latief Atelier |
| アカウントID | 416352953 |
| プロパティID | 564435992 |
| ウェブストリーム名 | Latief Atelier ホームページ |
| ストリームID | 16350003406 |
| 測定ID | G-FSP5PN85QD |
| サイトの設定 | enabled:true / 本番ホスト・HTTPSのみ送信 |
| Google側の拡張計測機能 | オフ（独自のクリック計測と重複させない） |

利用規約はユーザーが確認・同意してアカウントを作成した。アクセス権の第三者追加、API Secretの作成、広告サービスとの連携はしていない。

## 後から見る数字

Googleアナリティクスにログインして、対象プロパティ「Latief Atelier」を選択し、期間を指定して確認する。集計画面は所有者のアカウント内で見るもので、公開ホームページに閲覧者全体の数字を表示するものではない。

| 確認したいこと | 主に見る集計 |
| --- | --- |
| 何人がサイトに来たか | ユーザー数・セッション数 |
| 何からサイトに来たか | トラフィック獲得・参照元/メディア・チャネル |
| どの情報が読まれたか | ページとスクリーン / ページパス別の表示回数 |
| 予約ページへ何回移動したか | reservation_click |
| LINE相談へ何回移動したか | line_click |
| どのSNSへ移動したか | social_clickをlink_destination別に比較 |
| スマホ固定ボタンが使われたか | 各クリックをlink_placement=mobile_barで確認 |

「表示回数」「ユーザー数」「クリック回数」は別の数字。同じ人が繰り返しクリックする場合もある。予約先へのクリックを、予約完了・売上・来店件数として扱わない。

## 独自のイベント

| イベント名 | 日本語での意味 | link_destination |
| --- | --- | --- |
| reservation_click | 石田学指名のホットペッパー予約ページを開く | hotpepper |
| line_click | LINE相談を開く | line |
| reservation_form_open | Googleフォームの予約希望画面を開く | google_form |
| social_click | SNS・noteへ移動 | instagram / tiktok / note |
| map_click | Googleマップを開く | google_maps |

追加パラメーター：link_placement（header / mobile_bar / footer / hero / reservation / journal / guide / access / content）。ページはpage_locationとpage_pathで区別し、/index.htmlと/は/に統一する。

GA4に登録済みのイベントスコープのカスタムディメンション：

1. 「リンク先」→ パラメーター名 link_destination
2. 「ボタンの位置」→ パラメーター名 link_placement

拡張計測の一般的なclickイベントは無効。サイト側の独自イベントで集計する。reservation_clickとline_clickはキーイベントとして事前登録済み。金額は設定せず、キーイベントはセッションごとに1回、通常のイベント数はクリックの発生回数を確認する。これは予約完了や相談送信を意味しない。

## 集計開始と限界

- 集計は本番にタグを公開した後から。過去の未計測アクセスを遡って復元することはできない。
- GA4の画面に反映されるまで時間差がある。接続確認はリアルタイム/DebugViewと通常レポートを区別して行う。
- ホットペッパー上の予約完了、LINEの相談内容、Googleフォーム送信内容は、このタグでは取得しない。
- SNSアプリが参照元を渡さない場合など、流入元が正確に分からないことがある。SNSからHPに貼るリンクのUTM設計は、実際に使うURLと運用を確認して別途整える。
- 検索語句、検索での表示回数・掲載順位はSearch Console側の情報。現時点でSearch Consoleは接続していない。

## 実装の範囲

本番ホストlatiefatelier.com・HTTPS・有効な自分のGA4測定ID・enabled:trueがそろった場合だけ、Googleタグを読み込む。localhostや別のプレビューホストからは送信しない。

氏名・メール・電話・フォームの入力内容・LINEのメッセージ・任意のリンク全文を独自イベントに含めない。ページのクエリ文字列とハッシュは削除し、参照元はオリジンだけに絞る。広告パーソナライズとGoogleシグナルは無効。

privacy.htmlから、このブラウザーでの解析を停止/許可できる。設定はブラウザー内に保存。説明ページは解析のための案内であり、店舗の他の個人情報の取り扱いや外部サービスのポリシーを代替するものではない。

## 検証

node --test analytics.test.cjs：7件通過。誤った指名IDの除外、各クリックの区別、プレビュー送信防止、二重初期化防止、URL内情報の除外、解析停止、トップURLの統一を確認。

Googleへ本番データが実際に届くことと、GA4レポートの集計結果は、本番公開後に確認する。架空の閲覧数・成果件数は作成しない。

## 参照した公式資料

- https://developers.google.com/analytics/devguides/collection/ga4/events?hl=ja
- https://developers.google.com/tag-platform/gtagjs/configure?hl=ja
- https://support.google.com/analytics/answer/9216061?hl=ja

## 集計画面への入口

https://analytics.google.com/analytics/web/provision/?pli=1#/a416352953p564435992/reports/intelligenthome

利用規約を確認したGoogleアカウントでログインする。アカウント/プロパティは「Latief Atelier」。ホーム画面でユーザー・表示回数・イベント数・キーイベントを切り替え、期間を指定できる。カスタム定義は「管理 → データの表示 → カスタム定義」で確認。

公開前の画面に表示される0や「データがありません」は、測定対象サイトが未公開のためであり、実際の訪問者が0だったという分析結果ではない。

## 登録済みレポートの使い方

「レポートのスナップショット」は「ユーザー行動」テンプレートを設定済み。上位ページ・ユーザー数・流入元・イベント数を期間指定で確認する。

- [集計ホーム](https://analytics.google.com/analytics/web/provision/?pli=1#/a416352953p564435992/reports/intelligenthome?params=_u..nav%3Dmaui&collectionId=business-objectives)
- [ページ別の表示回数](https://analytics.google.com/analytics/web/provision/?pli=1#/a416352953p564435992/reports/explorer?params=_u..nav%3Dmaui&ruid=all-pages-and-screens,business-objectives,examine-user-behavior&collectionId=business-objectives&r=all-pages-and-screens)
- [予約・LINE・SNSなどのイベント数](https://analytics.google.com/analytics/web/provision/?pli=1#/a416352953p564435992/reports/explorer?params=_u..nav%3Dmaui&ruid=top-events,business-objectives,examine-user-behavior&collectionId=business-objectives&r=top-events)

メニューからは「レポート → ユーザー エンゲージメントとユーザー維持率の把握 → ページとスクリーン / イベント」。イベント名でreservation_clickやline_clickを絞り込み、必要に応じて登録した「リンク先」「ボタンの位置」を使って比較する。

キーイベントとして登録したreservation_click・line_clickは、セッションごとに1回のカウントで金額なし。通常のイベント数には実際のクリック発生回数が集計される。予約完了や問い合わせ送信の確定数として解釈しない。

初回のデータ受信は本番公開後に確認する。リアルタイムの受信確認・通常レポートの反映確認はまだ完了扱いにしていない。
