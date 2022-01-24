package panda.reppy.commands.slashcommands;

import net.dv8tion.jda.api.EmbedBuilder;
import net.dv8tion.jda.api.entities.Member;
import net.dv8tion.jda.api.events.interaction.SlashCommandEvent;
import net.dv8tion.jda.api.interactions.commands.OptionMapping;
import net.dv8tion.jda.api.interactions.commands.OptionType;
import panda.reppy.commands.BaseCommand;
import panda.reppy.database.cache.ModelCache;
import panda.reppy.database.models.DatabaseModel;

import java.util.List;
import java.util.stream.Stream;

public class StatsCommand extends BaseCommand {

    public StatsCommand() {
        super("stats", "Get the reputation stats of a user.");

        addOption(OptionType.USER, "user", "The user to get reputation stats for.");
    }

    @Override
    public boolean execute(SlashCommandEvent event) {
        List<OptionMapping> options = event.getOptions();
        Member requester = event.getMember();
        Member requested = requester;
        String requestedId = requested.getId();

        if (options.size() > 0) {
            requested = options.get(0).getAsMember();
            requestedId = requested.getId();
        }

        EmbedBuilder builder = new EmbedBuilder()
                .setTitle(String.format("Stats for %s", requested.getEffectiveName()))
                .setAuthor(requester.getEffectiveName())
                .addField("Reputation", Integer.toString(0), false);

        List<DatabaseModel> questionModels =
                ModelCache.retrieveModelsByField("questions", "authorId", requestedId);

        List<DatabaseModel> answerModels =
                ModelCache.retrieveModelsByField("answers", "authorId", requestedId);

        List<DatabaseModel> receivedVoteModels =
                ModelCache.retrieveModelsByField("votes", "receiverId", requestedId);
        List<DatabaseModel> givenVoteModels =
                ModelCache.retrieveModelsByField("votes", "authorId", requestedId);

        Stream<DatabaseModel> acceptedAnswerModels =
                answerModels.stream().filter(DatabaseModel::getAccepted);

        Stream<DatabaseModel> upvotesReceived =
                receivedVoteModels.stream().filter(DatabaseModel::getVoteType);
        Stream<DatabaseModel> downvotesReceived =
                receivedVoteModels.stream().filter(voteModel -> !voteModel.getVoteType());

        Stream<DatabaseModel> upvotesGiven =
                givenVoteModels.stream().filter(DatabaseModel::getVoteType);
        Stream<DatabaseModel> downvotesGiven =
                givenVoteModels.stream().filter(voteModel -> !voteModel.getVoteType());


        builder.addField("Questions Asked", Integer.toString(questionModels.size()), true);
        builder.addField("\u200b", "\u200b", true);
        builder.addField("\u200b", "\u200b", true);
        builder.addField("Answers Posted", Integer.toString(answerModels.size()), true);
        builder.addField("Accepted Answers", Long.toString(acceptedAnswerModels.count()), true);
        builder.addField("\u200b", "\u200b", true);
        builder.addField("<:upvote:934992735033761832> Upvotes Given", Long.toString(upvotesGiven.count()), true);
        builder.addField("<:upvote:934992735033761832> Upvotes Received", Long.toString(upvotesReceived.count()), true);
        builder.addField("\u200b", "\u200b", true);
        builder.addField("<:downvote:934992734945685504> Downvotes Given", Long.toString(downvotesGiven.count()), true);
        builder.addField("<:downvote:934992734945685504> Downvotes Received", Long.toString(downvotesReceived.count()), true);
        builder.addField("\u200b", "\u200b", true);

        event.replyEmbeds(builder.build()).queue();

        return true;
    }
}
