addEventListener('fetch', event => {
    event.respondWith(TelgramChannelStarter(event.request))
})

const ChannelName = 'taluohui815'
const version = "2.1.7"
let denined = true
const deninedRegion = ["CN"]
const TelgramChannelStarter = async (request) => {
    const url = new URL(request.url)
    const Region = request.headers.get('cf-ipcountry')
    if (!deninedRegion.includes(Region)) denined = false
    const proxyUrl = url.searchParams.get('proxy')
    if (!!proxyUrl) {
        if (!(proxyUrl.match(/\:\/\/(.*?)\.telegram\.org/g) || proxyUrl.match(/\:\/\/(.*)\.cdn\-telegram\.org/g)|| proxyUrl.match(/\:\/\/(.*)\.telesco\.pe/g))) return new Response('Proxy URL is not valid')
        return fetch(proxyUrl)
    }


    const startbefore = url.searchParams.get('startbefore')
    const ChannelUrl = new URL(`https://t.me/s/${ChannelName}`)
    if (!!startbefore) ChannelUrl.searchParams.set('before', startbefore)
    const getDataFromTelegram = await fetch(ChannelUrl, {
        "headers": {
            "x-requested-with": "XMLHttpRequest"
        },
        "method": "POST"
    })
        .then(res => res.text())
        .then(res => res
            .replace(/\\n/g, '')
            .replace(/\\(.)/g, '$1')
            .replace(/(^\"|\"$)/g, '')
        )
    if (url.searchParams.get('rawHtml') === 'true') return new Response(getDataFromTelegram, {
        headers: {
            "content-type": "text/html;charset=UTF-8",
            "Access-Control-Allow-Origin": "*"
        }
    })
    const nextBefore = Number((getDataFromTelegram.match(/data-before="([0-9]+)"/g) || ["0"])[0].match(/[0-9]+/g))
    const ChannelMessages = ElementSpliter(getDataFromTelegram, '<div class="tgme_widget_message_wrap')
    const ChannelMessageData = {}
    for (let ChannelMessage of ChannelMessages) {
        const MessageId = [...ChannelMessage.matchAll(/data-post\=\"(?<MID>.*?)\"/g)][0].groups.MID.split('/')[1]
        const MessageText = ElementSpliter(ChannelMessage, `<div class="tgme_widget_message_text js-message_text"`)[0] || ''
        if (!MessageText.match(/\#SFCN/g) && denined) continue
        const MessagePhoto = [...ChannelMessage.matchAll(/background\-image\:url\(\'(?<URL>.*?)\'\)/g)].map(e => e.groups.URL) || []
        const getViews = [...ChannelMessage.matchAll(/<span class="tgme_widget_message_views">(?<VIEWS>.*?)<\/span>/g)][0]
        ChannelMessageData[MessageId] = {
            text: MessageText
                .replace(/\<div (.*?)\>/g, '')
                .replace(/\<\/div\>/g, ''),
            image: MessagePhoto,
            time: new Date([...ChannelMessage.matchAll(/datetime\=\"(?<TIME>.*?)\"/g)][0].groups.TIME).getTime(),
            views: getViews ? getViews.groups.VIEWS : null
        }
    }

    return new Response(JSON.stringify({
        nextBefore,
        Region,
        version,
        ChannelMessageData
    }), {
        headers: {
            "content-type": "application/json;charset=UTF-8",
            "Access-Control-Allow-Origin": "*"
        }
    })
}




const ElementSpliter = (html, StartElement) => {
    const Elements = []
    const ElementSpliterOnce = (html, StartElement) => {
        let ElementName = [...StartElement.matchAll(/\<(?<ELENAME>[a-zA-Z0-9]+)\s/g)][0].groups.ELENAME
        let ElementContent = StartElement
        for (let Start = html.indexOf(StartElement) + StartElement.length; Start < html.length; Start++) {
            ElementContent += html[Start]
            if (ElementContent.endsWith(`</${ElementName}>`)) {
                const PrefixCount = Object.keys(ElementContent.match(new RegExp(`\<${ElementName}`, 'g'))).length
                const SuffixCount = Object.keys(ElementContent.match(new RegExp(`\<\/${ElementName}(.*?)>`, 'g')) || []).length
                if (
                    PrefixCount === SuffixCount &&
                    PrefixCount !== 0
                ) {
                    return ElementContent
                }
            }

        }
    }
    while (1) {
        if (html.indexOf(StartElement) === -1) break
        const SplitOnce = ElementSpliterOnce(html, StartElement)
        Elements.push(SplitOnce)
        html = html.replace(SplitOnce, '')
    }
    return Elements
}