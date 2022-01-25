package panda.reppy.commands.slashcommands;

import net.dv8tion.jda.api.EmbedBuilder;
import net.dv8tion.jda.api.entities.*;
import net.dv8tion.jda.api.events.interaction.SlashCommandEvent;
import net.dv8tion.jda.api.events.message.MessageReceivedEvent;
import panda.reppy.commands.BaseCommand;
import panda.reppy.database.ModelDao;
import panda.reppy.entities.MessageWaiter;
import panda.reppy.entities.QuestionBuilder;
import panda.reppy.util.constants.SnowflakeConstants;

import java.awt.*;
import java.util.List;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

public class PostQuestion extends BaseCommand {

    private final static List<String> CANCEL_WORDS = Arrays.asList("stop", "quit");

    private final Set<String> current;
    private final Map<String, QuestionBuilder> builderMap;

    public PostQuestion() {
        super("post-question", "Begin the process of posting a question.");

        this.current = new HashSet<>();
        this.builderMap = new HashMap<>();
    }

    @Override
    public boolean execute(SlashCommandEvent event) {
        if (!event.getTextChannel().getId().equals(SnowflakeConstants.ASK_QUESTION_CHANNEL_ID)) {
            event.reply("Please use <#" + SnowflakeConstants.ASK_QUESTION_CHANNEL_ID + "> to ask questions.")
                    .setEphemeral(true).queue();
            return false;
        }

        final Member member = event.getMember();

        final String memberId = member.getId();

        if (current.contains(memberId)) {
            event.reply("You are already building a question.").queue(response ->
                    response.deleteOriginal().queueAfter(5, TimeUnit.SECONDS));
            return false;
        }

        Guild guild = event.getGuild();
        if (guild == null) {
            event.reply("Failed to fetch guild.").queue(response ->
                    response.deleteOriginal().queueAfter(5, TimeUnit.SECONDS));
            return false;
        }

        TextChannel threadChannel = guild.getTextChannelById(SnowflakeConstants.THREAD_CHANNEL_ID);
        if (threadChannel == null) {
            event.reply("Failed to fetch thread channel.").queue(response ->
                    response.deleteOriginal().queueAfter(5, TimeUnit.SECONDS));
            return false;
        }

        // Check for previous questions with similar titles
        // TODO Implement similarity check on titles
//        List<ThreadChannel> threads = threadChannel.getThreadChannels();
//        for (ThreadChannel thread : threads) {
//            // TODO - Check for similar instead of exact.
//            if (thread.getName().equals(title)) {
//                // - Reply with any matches and return
//                event.reply("Found matching channel here <#" + thread.getId() + ">.")
//                        .setEphemeral(true).queue(response ->
//                                response.deleteOriginal().queueAfter(30, TimeUnit.SECONDS));
//                return true;
//            }
//        }

        current.add(memberId);
        builderMap.put(memberId, new QuestionBuilder(memberId));

        event.getTextChannel()
                .createThreadChannel(String.format("Question Building for %s", member.getEffectiveName()), true)
                .queue(thread -> {
                    thread.addThreadMember(member).queue();
                    thread.sendMessage(member.getAsMention() + ", Welcome to your personal Question Builder.\n" +
                                    "If at any point in time, you want to quit building, say `quit`.")
                            .queue();
                    handleTitle(event, thread, event.getIdLong(), null);
                });

        event.reply("Question posted.").queue();
        return true;
    }

    private MessageEmbed generateStagedEmbed(String stage, String message, boolean isPrompt) {
        EmbedBuilder builder = new EmbedBuilder()
                .setTitle(stage)
                .addField("\u200b", message, true)
                .setColor(isPrompt ? Color.RED : new Color(32, 209, 181))
                .setFooter("Reply `quit` to stop.");

        return builder.build();
    }

    private void handleTitle(SlashCommandEvent event, ThreadChannel thread, long lastMessage, String prompt) {
        QuestionBuilder questionBuilder = builderMap.get(event.getMember().getId());
        String toSend = "Please provide what the title of your question should be.\n" +
                "A good question title is short and to the point.";
        if (prompt != null) {
            toSend = prompt;
        }

        thread.sendMessageEmbeds(generateStagedEmbed("Title", toSend, prompt != null)).queue();

        wait(event, thread, lastMessage, e -> {
            Message message = e.getMessage();
            String content = message.getContentRaw();

            if (content.equalsIgnoreCase("quit")) {
                cleanMessages(event, thread);
            }

            if (content.split(" ").length < 6) {
                String newPrompt = String.format("Your title was not descriptive enough, please try a better title.\n" +
                        "Title: %s", content);
                handleTitle(event, thread, lastMessage, newPrompt);
                return;
            }

            questionBuilder.setTitle(content);
            handleBody(event, thread, message.getIdLong(), null);
        });
    }

    private void handleBody(SlashCommandEvent event, ThreadChannel thread, long lastMessage, String prompt) {
        QuestionBuilder questionBuilder = builderMap.get(event.getMember().getId());
        String toSend = "Please provide what the body of your question should be.\n" +
                "A good question body is descriptive and clarifies what your end goal is.";
        if (prompt != null) {
            toSend = prompt;
        }

        thread.sendMessageEmbeds(generateStagedEmbed("Body", toSend, prompt != null)).queue();

        wait(event, thread, lastMessage, e -> {
            Message message = e.getMessage();
            String content = message.getContentRaw();

            if (content.equalsIgnoreCase("quit")) {
                cleanMessages(event, thread);
            }

            if (content.split(" ").length < 25) {
                String newPrompt = String.format("Your body was not descriptive enough, please provide more details.\n" +
                        "```\n%s\n```", content);
                handleBody(event, thread, lastMessage, newPrompt);
                return;
            }

            questionBuilder.setBody(content);
            handleCodeblock(event, thread, message.getIdLong());
        });
    }

    private void handleCodeblock(SlashCommandEvent event, ThreadChannel thread, long lastMessage) {
        QuestionBuilder questionBuilder = builderMap.get(event.getMember().getId());
        String toSend = "Please provide any codeblocks relevant to your question.\n" +
                "If you do not have any code to provide, reply with `skip`.";

        thread.sendMessageEmbeds(generateStagedEmbed("Codeblock", toSend, false)).queue();

        wait(event, thread, lastMessage, e -> {
            Message message = e.getMessage();
            String content = message.getContentRaw();

            if (content.equalsIgnoreCase("quit")) {
                cleanMessages(event, thread);
            }

            if (!content.equalsIgnoreCase("skip")) {
                if (content.contains("```lua")) content = content.replace("```lua", "");
                if (content.contains("`")) content = content.replaceAll("`", "");

                content = "```lua\n" + content + "\n```";

                questionBuilder.setCodeblock(content);
            }

            handleOutput(event, thread, message.getIdLong());
        });
    }

    private void handleOutput(SlashCommandEvent event, ThreadChannel thread, long lastMessage) {
        QuestionBuilder questionBuilder = builderMap.get(event.getMember().getId());

        String toSend = "Please provide any output relevant to your question.\n" +
                "If you do not have any output to provide, reply with `skip`.";

        thread.sendMessageEmbeds(generateStagedEmbed("Output", toSend, false)).queue();

        wait(event, thread, lastMessage, e -> {
            Message message = e.getMessage();
            String content = message.getContentRaw();

            if (content.equalsIgnoreCase("quit")) {
                cleanMessages(event, thread);
            }

            if (!content.equalsIgnoreCase("skip")) {
                if (content.contains("`")) content = content.replaceAll("`", "");

                content = "```\n" + content + "\n```";

                questionBuilder.setOutput(content);
            }

            postQuestion(event, thread);
        });
    }

    private void postQuestion(SlashCommandEvent event, ThreadChannel thread) {
        Guild guild = event.getGuild();
        TextChannel channel = guild.getTextChannelById(SnowflakeConstants.THREAD_CHANNEL_ID);
        Member member = event.getMember();
        QuestionBuilder builder = builderMap.get(member.getId());

        channel.createThreadChannel(builder.getTitle()).queue(postedThread -> {
            postedThread.sendMessage("**Question posted by: " + event.getMember().getAsMention() + "**\n\n" +
                    builder.getBody()).queue(message -> postedThread.pinMessageById(message.getId()).queue());
            if (builder.getCodeblock() != null) {
                postedThread.sendMessage(builder.getCodeblock()).queue();
            }
            if (builder.getOutput() != null) {
                postedThread.sendMessage(builder.getOutput()).queue();
            }

            ModelDao.generateQuestionModel(postedThread, builder);
            cleanMessages(event, thread);
        });
    }

    private void wait(SlashCommandEvent event, ThreadChannel thread, long lastMessage, Consumer<MessageReceivedEvent> action) {
        getWaiter(event).waitForGuildMessageReceived(
            e -> e.getAuthor().equals(event.getUser()) && e.getChannel().equals(thread)
                    && e.getMessageIdLong() != lastMessage,
            e -> {
                if (CANCEL_WORDS.contains(e.getMessage().getContentRaw().toLowerCase())) {
                    current.remove(event.getUser().getId());
                    cleanMessages(event, thread);
                    e.getMessage().delete().queue();
                    return;
                }
                action.accept(e);
            }, 5, TimeUnit.MINUTES, new Timeout(event, thread));
    }

    private void cleanMessages(SlashCommandEvent event, ThreadChannel thread) {
        String userId = event.getUser().getId();

        if (thread != null && event.getGuild().getThreadChannelById(thread.getId()) != null) {
            thread.delete().queue();
        }

        current.remove(userId);
    }

    private MessageWaiter getWaiter(SlashCommandEvent event) {
        for(Object ev: event.getJDA().getEventManager().getRegisteredListeners())
            if(ev instanceof MessageWaiter)
                return (MessageWaiter) ev;
        return null;
    }

    private class Timeout implements Runnable
    {
        private final SlashCommandEvent event;
        private final ThreadChannel thread;
        private boolean ran = false;

        private Timeout(SlashCommandEvent event, ThreadChannel thread)
        {
            this.event = event;
            this.thread = thread;
        }

        @Override
        public void run()
        {
            if(ran)
                return;
            ran = true;
            thread.sendMessage("Uh oh! You took longer than 5 minutes to respond, "
                    + event.getMember().getAsMention() + "!").queue();
            current.remove(event.getUser().getId());
            cleanMessages(event, thread);
        }
    }
}
